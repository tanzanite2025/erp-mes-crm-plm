export interface ScanHostAdapter<
  TFormValue,
  TPayload,
  THostContext,
  TSubmitDraft,
  TOptions = unknown,
> {
  toHostContext: (form: TFormValue, options?: TOptions) => THostContext
  applyScanPayload: (form: TFormValue, payload: TPayload) => TFormValue
  toSubmissionDraft: (form: TFormValue, payload?: TPayload) => TSubmitDraft
}
