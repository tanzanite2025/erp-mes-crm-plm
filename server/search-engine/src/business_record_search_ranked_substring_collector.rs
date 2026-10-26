use std::{cmp::Reverse, collections::BinaryHeap, sync::Arc};
use tantivy::{
    collector::{Collector, SegmentCollector},
    schema::Field,
    store::StoreReader,
    DocId, Score, SegmentReader, TantivyError,
};

use crate::business_record_search_index::{
    normalize_business_record_search_text, BusinessRecordSearchDocument,
};

// The smallest tuple is the best result. The heap retains only offset+limit+1
// matches instead of allocating every matching record for broad single-character queries.
pub type RankedBusinessRecordSearchMatch = (Reverse<u32>, String, String, String);

pub struct RankedBusinessRecordSubstringCollector {
    pub document_field: Field,
    pub query: Arc<String>,
    pub keywords: Arc<Vec<String>>,
    pub capacity: usize,
}

pub struct RankedBusinessRecordSubstringSegmentCollector {
    document_field: Field,
    query: Arc<String>,
    keywords: Arc<Vec<String>>,
    capacity: usize,
    store: StoreReader,
    matches: BinaryHeap<RankedBusinessRecordSearchMatch>,
    error: Option<String>,
}

fn retain_highest_ranked_business_record_match(
    matches: &mut BinaryHeap<RankedBusinessRecordSearchMatch>,
    candidate: RankedBusinessRecordSearchMatch,
    capacity: usize,
) {
    if matches.len() < capacity {
        matches.push(candidate);
    } else if matches.peek().is_some_and(|worst| candidate < *worst) {
        matches.pop();
        matches.push(candidate);
    }
}

impl Collector for RankedBusinessRecordSubstringCollector {
    type Fruit = Result<Vec<RankedBusinessRecordSearchMatch>, String>;
    type Child = RankedBusinessRecordSubstringSegmentCollector;

    fn for_segment(
        &self,
        _segment_id: u32,
        segment: &SegmentReader,
    ) -> tantivy::Result<Self::Child> {
        Ok(Self::Child {
            document_field: self.document_field,
            query: self.query.clone(),
            keywords: self.keywords.clone(),
            capacity: self.capacity,
            store: segment.get_store_reader(10)?,
            matches: BinaryHeap::new(),
            error: None,
        })
    }

    fn requires_scoring(&self) -> bool {
        false
    }

    fn merge_fruits(&self, segments: Vec<Self::Fruit>) -> tantivy::Result<Self::Fruit> {
        let mut matches = BinaryHeap::new();
        for segment in segments {
            for candidate in segment.map_err(TantivyError::InvalidArgument)? {
                retain_highest_ranked_business_record_match(&mut matches, candidate, self.capacity);
            }
        }
        Ok(Ok(matches.into_sorted_vec()))
    }
}

impl SegmentCollector for RankedBusinessRecordSubstringSegmentCollector {
    type Fruit = Result<Vec<RankedBusinessRecordSearchMatch>, String>;

    fn collect(&mut self, document_id: DocId, _score: Score) {
        if self.error.is_some() {
            return;
        }
        let read_document = || -> anyhow::Result<BusinessRecordSearchDocument> {
            let indexed_document = self.store.get(document_id)?;
            let encoded = indexed_document
                .get_first(self.document_field)
                .and_then(|value| value.as_text())
                .ok_or_else(|| anyhow::anyhow!("search document payload is missing"))?;
            Ok(serde_json::from_str(encoded)?)
        };
        let record = match read_document() {
            Ok(record) => record,
            Err(error) => {
                self.error = Some(error.to_string());
                return;
            }
        };
        let text = normalize_business_record_search_text(&record.model);
        if !self.keywords.iter().all(|keyword| text.contains(keyword)) {
            return;
        }
        let code = normalize_business_record_search_text(&record.code);
        let title = normalize_business_record_search_text(&record.name);
        let score = if code == *self.query {
            100
        } else if title == *self.query {
            80
        } else if code.starts_with(self.query.as_str()) {
            60
        } else if title.starts_with(self.query.as_str()) {
            40
        } else {
            20
        };
        retain_highest_ranked_business_record_match(
            &mut self.matches,
            (Reverse(score), record.name, record.category, record.id),
            self.capacity,
        );
    }

    fn harvest(self) -> Self::Fruit {
        match self.error {
            Some(error) => Err(error),
            None => Ok(self.matches.into_sorted_vec()),
        }
    }
}
