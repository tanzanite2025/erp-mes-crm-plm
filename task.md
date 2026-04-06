# 隞餃𦛚��圾嚗ōask.md嚗�

## 隞餃𦛚�拙�嚗�2026-04-05嚗�- 憿寧𤌍�𦯀����銝𦒘��𤥁恣��

- [x] 1. 璇喟� Features 撅���諹提�滚�銝𤾸虾��僎摮鞾�
  - 憸��蝏𤘪�嚗𡁶＆霈� `trading/logistics`��purchase-logistics`��trading/suppliers` �𠰴�隞㚚�韐剔㮾�喲�餉��臬炏摮睃銁�滚��唳旿瘚����憭滩”�閧𠶖����滚��亥砭/靽嘥��餉���
  - �扯�蝏𤘪�嚗𡁜歇蝖株恕 `logistics` 銝� `purchase-logistics` �諹膘撟嗅�撟嗅�鈭� `/logistics` 韏��嚗䔶���揚�拇���鉄蝳餌瑪�厩阮銝擧醌�誯���嚗��鈭𢛶�𨅯虾�梁鍂摨訫�����舐凒�亦′��僎�腈���摨𥪜��餉�敶枏�銝餉���葉�� `trading` �����𧊋�𤑳緵蝚砌�憟堒僎銵峕��～��

- [x] 2. 璇喟� Services / Hooks 撅���𡁶鍂 CRUD 銝𤾸撕蝒㛖𠶖���雿�
  - 憸��蝏𤘪�嚗𡁶＆霈� `src/features/*/services/*.ts` 銝剜糓�血��典虾�質情���銝�霂瑟�璅∪�嚗䔶誑�� `useActionDialog`��useListFilter`��”�� Hook �臬炏�厰�憭滚��啜��
  - �扯�蝏𤘪�嚗𡁜歇蝖株恕 `use-trading`��use-purchase`��use-users`��use-logistics`��use-experimental` 摮睃銁�擧遬�� query/mutation/invalidate/toast �滚�撉冽沲嚗𢱌*-action-dialog.tsx` ��辣撟踵�摮睃銁嚗屸����𡒊賒�賢ㄢ撅��雿��摰靝�甈⊥�批抅蝐餃��券�銝𡁜𦛚銵典���

- [x] 3. 璇喟� Components 撅�� UI 蝏�辣�滚�銝舘����蝘�
  - 憸��蝏𤘪�嚗𡁶＆霈� `src/components/ui` �臬炏摮睃銁�芯蝙�函�隞嗚��� Feature �臬炏隞滨凒�乩�韏硋抅蝖� UI 蝏�辣�峕𧊋�嗆��� `src/components/uds`嚗�僎霂�� `action-dialog.tsx` 蝐餃撕蝒㛖��滚�撉冽沲��
  - �扯�蝏𤘪�嚗𡁜歇蝖株恕 `src/components/uds` 敶枏�隞��撠煾�撌乩�憯喳�蝏�辣嚗䈣src/components/ui` �冽迤撘譍��∩葉隞齿糓銝餉楝敺��`accordion`��calendar`��input-otp`��tooltip`��sheet` 蝑匧�摮睃銁�笔�撘閧鍂嚗䔶��賣��桀�銝�������扎��

- [x] 4. 璇喟��賡��硔������蝵桐��齿�畾衤�
  - 憸��蝏𤘪�嚗𡁶＆霈斤′蝻𣇉�銝剜�����罸���虜�譌��rgMgmt / UnitMgmt 蝑㗇芋�㛖��批��唳��踺���隞賭誨���瘜券�摰鮋�畾菜糓�血��具��
  - �扯�蝏𤘪�嚗𡁜歇蝖株恕 `features/experimental/hooks/use-experimental.ts` 摮睃銁蝖祉���葉�� toast嚗�僎撌脣��鞟洵銝��嫣�憌𡡞埯 i18n �嗅藁嚗𢱌src/config` 敶枏�隞� `fonts.ts`嚗峕��罱�𨅯之�讛��罸���虜�謿�肽��殷�`OrgMgmt` / `UnitMgmt` 銝餉��桅��舐�隞嗅�憭找� UDS 閬��銝滚��湛��芸��唳�蝖桀�隞賣�隞嗆��踺��

- [x] 5. 撖寞��㗇�皜��撖寡情�扯�撘閧鍂銝𤾸蔣�漤𢒰�⊿�
  - 憸��蝏𤘪�嚗𡁜銁�𣂼枂�𣳇膄�硋�撟嗅遣霈桀�嚗���𣂼�撅� grep �⊿�嚗𣬚＆靽苷�摮睃銁�䠷�撘閧鍂�諹䌊�函��鞾曎頝航秤隡歹�撠文��單釣 `routeTree.gen.ts` �詨�頝舐眏���靘肽���
  - �扯�蝏𤘪�嚗𡁜歇摰峕���笆 `purchase-logistics`���摨𥪜��曇楝��components/ui` �笔�蝏�辣銝舘楝�梁��鞾曎頝舐��典� grep �⊿�嚗𥕦歇蝖株恕 `routeTree.gen.ts` 銝箇��𣂷漣�抬�擃㗛��拇�����墧滲 `src/routes/**` 皞鞉�隞嗉�屸��湔𦻖�寧��鞉�隞嗚��

- [x] 6. 颲枏枂�𨀣糓�血��冽�瘣�/�𦯀��嫖�萘�霂�旿�𣇉�霈�
  - 憸��蝏𤘪�嚗𡁏��𨅯歇蝖株恕摮睃銁 / �典�摮睃銁雿��靚冽� / ���霂�旿�嘥�蝐餉��綽�撟嗥��箸��煺��碶���漣��犖撌仿�霂���蓥���閬��蝖株恕��器�䎚��
  - �扯�蝏𤘪�嚗𡁜歇颲枏枂霂�旿�𣇉�霈綽�撟嗅銁雿䭾鸌����扯��寞� B ����嫣�憌𡡞埯�嗆�嚗�1) 撠� `experimental` 璅∪�蝖祉��� toast 餈�宏�� `src/locales/messages/{zh-CN,en-US}/experimental.ts`嚗�2) �啣�頧駁��曹澈 helper `src/lib/react-query-mutation.ts`嚗�僎�� `src/features/users/hooks/use-users.ts` 擐𡝗活�亙�嚗峕𤣰�� users mutation ���銝�憭望��餉�嚗�3) 撠� `src/features/quality/hooks/use-quality.ts` 皜鞱��亙��䔶� helper嚗𣬚�銝���捶璅∪� mutation ��仃����𣂼��鞟內撉冽沲嚗�4) 撠� `src/features/logistics/hooks/use-logistics.ts` 皜鞱��亙��䔶� helper嚗䔶��坔�蝒��蝷箔�憭梯揖����餉�嚗䔶��嗆��𣂼��𡒊�蝏煺�憭望�銝� toast 撉冽沲嚗�5) �啣� `src/components/action-dialog-shell.tsx` 銝� `src/components/action-dialog-shell.styles.ts`嚗�僎�� `customer-action-dialog.tsx`��supplier-action-dialog.tsx` 霂閧��亙�嚗峕𡂝蝳駁�𡁶鍂撘寧�憯喳��䔶��嫣��∟”�閗祗銋㚁�6) 撠��銝�憯喳�蝏抒賒�拙��� `unit-action-dialog.tsx` 銝� `job-action-dialog.tsx` 銝支葵��� CRUD 撘寧�嚗諹�銝�甇仿�霂���刻器�䕘�7) 撠� `org-action-dialog.tsx` �亙��䔶�憯喳�嚗�僎憿箸��嗆�銝支葵雿𡡞��� `any` 蝐餃��剛�嚗䔶����蝏��銵典�銝擧�鈭方祗銋劐��矋�8) 撠� `standard-action-dialog.tsx` �亙��䔶�憯喳�嚗䔶��坔�韐冽���”�𨰻����祆�蝷箝��oast 銝𦒘�摮睃��剛祗銋劐��塩��

## ���臬�箸祥��蔭甈∴�敺�＆霈歹�

- [x] 1. �箏��祈蔭瘝餌�颲寧�
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧桐�憭��撌脫𠂔�脩����臬�綽�銝滨誧蝏剜�撅� `ActionDialogShell` �亙���凒��
  - �扯�蝏𤘪�嚗𡁜歇�厩＆霈斗䲮獢��銵䕘��祈蔭隞�祥�� `*-action-dialog.tsx` 銝剖歇�湧蠧�� `useEffect -> setState` 銝� `job-action-dialog.tsx` ��遬撘� `any`嚗峕𧊋蝏抒賒�啣�憯喳��亙��格���

- [x] 2. 憭��銵典��峕郊璅∪����臬��
  - 憸��蝏𤘪�嚗𡁜銁銝齿㺿�䀝��∟祗銋厩��齿�銝页��鞉郊瘨�膄 `customer`��supplier`��unit`��standard` 蝑匧撕蝒𦯀葉�峕郊 `setState` 撘訫��� lint��
  - �扯�蝏𤘪�嚗𡁜歇撠� `customer-action-dialog.tsx`��supplier-action-dialog.tsx`��unit-action-dialog.tsx`��standard-action-dialog.tsx` �嫣蛹�𨅯�憪见�� + �厩阮閬���脲芋撘𧶏�蝘駁膄 effect 銝剔��峕郊 `setState`嚗䔶����摮䀝��喲𡡒霂凋�銝滚���

- [x] 3. 憭���曉� `any` 蝐餃�甈㰘揭
  - 憸��蝏𤘪�嚗𡁏𤣰�� `job-action-dialog.tsx` 蝑㗇�隞嗡葉��遬撘� `any`嚗諹‘朣𣂼��函��𥪜�蝐餃���”�閧掩�𧢲� i18n key �剛�颲寧���
  - �扯�蝏𤘪�嚗𡁜歇�� `job-action-dialog.tsx` 銝剔宏�� `zodResolver(... ) as any`��values as any` 隞亙� `t('...') as any`嚗峕㺿銝箸遬撘� `TranslationKey` 撣賊�銝𤾸��函掩�卝��

- [x] 4. �扯�摰𡁜�撉諹�銝𤾸�敶坿扇敶�
  - 憸��蝏𤘪�嚗𡁜��鞟𤌍���隞� lint / 蝐餃�璉��伐�撟嗅銁 `walkthrough.md` 霈啣��祈蔭瘝餌��滚�撌桀�����䠷★銝擧𧊋憭���笔���
  - �扯�蝏𤘪�嚗𡁜歇撖� 5 銝芰𤌍���隞嗆�銵���� `eslint` 撉諹�嚗𣬚��𣈯�朞�嚗𥕦�蝏剖銁 `walkthrough.md` 霈啣��祈蔭瘝餌���凒����䠷★銝𡡞��抵器�䎚��

## ���臬�箸祥��洵鈭諹蔭嚗��蝖株恕嚗�

- [x] 1. �箏�蝚砌�頧格祥��器��
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧株��血�憭� `react-hook-form reset` 蝐� effect �箸艶銝𦒘�銝�頧格𧊋閬������函掩�𧢲�韐佗�銝滚��啁���𡂝憯喃遙�～��
  - �扯�蝏𤘪�嚗𡁜歇�㗇�撅閧��寞��扯�嚗𡁜�蝑𥟇䰻 `form.reset()` + effect �箸艶嚗��撠�虾撅��券𡡒�舐� `org-action-dialog.tsx` 銝� `job-action-dialog.tsx` 蝥喳�瘝餌�嚗𢱌users-action-dialog.tsx` �㰘��典���漲颲��嚗峕�銝滨熙�交𧋦頧柴��

- [x] 2. 霂�摯撟嗆祥�� `react-hook-form reset` �箸艶
  - 憸��蝏𤘪�嚗𡁜銁銝滨聦�讛”�訫�霂凋�����𣂷�嚗諹��怠�憭� effect/reset �芯�撅硺�����峕郊嚗�𪑛鈭𥕦虾隞交㺿銝箸凒蝔喳����憪见��� key �滨蔭璅∪���
  - �扯�蝏𤘪�嚗𡁜歇撠� `org-action-dialog.tsx` 銝� `job-action-dialog.tsx` �嫣蛹�𨅯抅鈭� `key` ��”�訫�靘钅�撱� + 暺䁅恕�澆�憪见��脲芋撘𧶏�蝘駁膄 effect 銝剔� `form.reset()` �峕郊�餉�嚗䔶����鈭支��喲𡡒霂凋�銝滚���

- [x] 3. �嗆��拐�撅��函掩�𧢲�韐�
  - 憸��蝏𤘪�嚗帋耨憭滨洵鈭諹蔭�格���辣銝凋��臬��冽𤣰�𤤿�撅��函掩�钅䔮憸矋�雿���拙��鞱楊璅∪�蝐餃�蝟餌��寥�𨬭��
  - �扯�蝏𤘪�嚗𡁶洵鈭諹蔭�格���辣�芣鰵憓鮋�憭𣇉掩�见捐�吔�瘝輻鍂蝚砌�頧桀歇摰峕��� `job-action-dialog.tsx` 蝐餃��嗆�蝏𤘪�嚗�僎靽脲� `org-action-dialog.tsx` ����典��函掩�贝器�䎚��

- [x] 4. �扯�摰𡁜�撉諹�銝𤾸�敶坿扇敶�
  - 憸��蝏𤘪�嚗𡁜��鞟𤌍���隞� lint / 蝐餃�璉��伐�撟嗅銁 `walkthrough.md` 霈啣�蝚砌�頧格祥����栶����䠷★銝𡒊��晞��
  - �扯�蝏𤘪�嚗𡁜歇撖� `org-action-dialog.tsx` 銝� `job-action-dialog.tsx` �扯�摰𡁜� `eslint` 撉諹�嚗𣬚��𣈯�朞�嚗𥕦僎�� `walkthrough.md` 銵亙��祈蔭蝑偦�劐��柴���銵𣬚��靝�靽萘�憿嫘��

## users-action-dialog 擃䁅�血�銵典����臬�箄�隡堆�敺�＆霈歹�

- [x] 1. �箏��祈蔭瘝餌�颲寧�
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧桐��𡁶� `src/features/users/components/users-action-dialog.tsx`嚗�����雿𦦵鍂璅∪�嚗���喳��臬炏��閬�𠶖��𤣰�䜘��
  - �扯�蝏𤘪�嚗𡁜歇�㗇鸌��䲮獢��銵䕘��祈蔭隞���� `users-action-dialog.tsx` ����血��臭��冽����銝齿�撅訫��嗡�璅∪�嚗䔶��芸�蝥找蛹����𣇉鍂�瑕��齿���

- [x] 2. ���憭𡁜�雿𦦵鍂�交�
  - 憸��蝏𤘪�嚗𡁜�敶枏���辣銝剔��𨅯�撌亙�頧�/蝏���烐�撠�/閫坿𠧧�刻�/�睃極�㗇𥋘�芸𢆡�𧼮‵/�𣂷漱�� reset�脲��諹提���嚗屸�雿� effect 瘛瑟�摨艾��
  - �扯�蝏𤘪�嚗𡁜歇�啣� `users-action-dialog.shared.ts`��use-users-action-dialog-options.ts` 銝� `use-users-action-dialog-sync.ts`嚗��銵典� schema���蝔𧢲㺭�桅�厰★���𨬭���撌仿�㗇𥋘�𥪜𢆡�餉�隞𦒘蜓蝏�辣銝剜��箝��

- [x] 3. �滩�隡啗”�閧𠶖��𤣰��
  - 憸��蝏𤘪�嚗𡁜銁�臭��冽����嚗���斗鱏 `form.reset()`��setValue()`��setError()` 蝑㕑��冽糓�虫��匧�閬���辷��芯��臭誑餈𥕢�甇交𤣰�䜘��
  - �扯�蝏𤘪�嚗𡁏𧋦頧株�隡啁�霈箔蛹����� `form.reset()`��setValue()`��setError()` 餈嗵��𥪜𢆡靚�鍂嚗𥕦��滚�隞砌��輯蝸�睃極蝏穃�����脫綫�𣂷��喲𡡒�嗅偏霂凋�嚗䔶�����冽𧊋餈𥕢�甇交����撘箄��嗆���

- [x] 4. �扯�摰𡁜�撉諹�銝𤾸�敶坿扇敶�
  - 憸��蝏𤘪�嚗𡁜��鞟𤌍���隞� lint / 蝐餃�璉��伐�撟嗅銁 `walkthrough.md` 霈啣��祈蔭���蝏𤘪�����䠷★銝擧𧊋憭���笔���
  - �扯�蝏𤘪�嚗𡁜歇撖� `users-action-dialog.tsx` 銝擧𧋦頧格鰵憓䂿� 3 銝芣����隞嗆�銵���� `eslint` 撉諹�嚗𣬚��𣈯�朞�嚗𥕦僎�� `walkthrough.md` 霈啣����蝏𤘪�銝𦒘��䠷★��

## users-action-dialog �孵�A嚗鬏eset/�喲𡡒�餉�銝擧�鈭斗����敺�＆霈歹�

- [x] 1. �箏��祈蔭瘝餌�颲寧�
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧桐��芾��� `src/features/users/components/users-action-dialog.tsx`嚗䔶��拙��� users �笔�隞㚚△�Ｘ�����曇楝��
  - �扯�蝏𤘪�嚗𡁜歇�㗇鸌��䲮獢��銵䕘��祈蔭隞���� `form.reset()` / �喲𡡒�餉�蝏煺�銝� `onSubmit` �𣂷漱頝臬����嚗峕𧊋�拙��� users �笔�隞㚚△�Ｘ��𡒊垢憟𤑳漲��

- [x] 2. �嗆� reset/�喲𡡒�餉�
  - 憸��蝏𤘪�嚗𡁜�撠� `Dialog onOpenChange`���撱箸��麄��凒�唳��煺�憭��憭滨� reset/�喲𡡒�嗅偏�餉�嚗𣬚�銝��鞉凒蝔喳�����典�鋆���
  - �扯�蝏𤘪�嚗𡁜歇�啣� `users-action-dialog.submit.ts`嚗�僎�賢枂蝏煺��� `buildDialogCloseHandler` 銝� `buildSubmitSuccessHandler`嚗峕𤣰�偦�憭滨� reset/�喲𡡒銝擧���𤣰撠暸�餉���

- [x] 3. ��� onSubmit 銝� payload ����
  - 憸��蝏𤘪�嚗𡁜�蝻𤥁�����脰圾�僐��ayload ���𨬭�����‘����餉�隞𦒘蜓�𣂷漱�賣㺭銝剜�撘�嚗屸�雿𤾸��賣㺭憭齿�摨艾��
  - �扯�蝏𤘪�嚗𡁜歇�賢枂 `resolveSubmitRole` 銝� `buildUserUpdatePayload`嚗��蝻𤥁�����脰圾�僐��凒�� payload ���牐�撖��銵亙��餉�隞� `onSubmit` 銝剔宏�綽�靽脲� create/update mutation 銵䔶蛹銝滚���

- [x] 4. �扯�摰𡁜�撉諹�銝𤾸�敶坿扇敶�
  - 憸��蝏𤘪�嚗𡁜��鞟𤌍���隞� lint / 蝐餃�璉��伐�撟嗅銁 `walkthrough.md` 霈啣��祈蔭�嗆�蝏𤘪�銝𦒘��䠷★��
  - �扯�蝏𤘪�嚗𡁜歇撖� `users-action-dialog.tsx`��users-action-dialog.submit.ts` �羓㮾�單����隞嗆�銵���� `eslint` 撉諹�嚗𣬚��𣈯�朞�嚗𥕦僎�� `walkthrough.md` 霈啣��祈蔭蝏𤘪�銝𦒘��䠷★��

## users-action-dialog �𣂷漱颲寧�蝏煺�嚗��蝖株恕嚗�

- [x] 1. �箏��祈蔭瘝餌�颲寧�
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧桀蘨�𡁶� `src/features/users/components/users-action-dialog.tsx` �� create/update �𣂷漱颲寧�蝏煺�嚗䔶��拙��啣�蝡舀𦻖��� users �嗡�憿菟𢒰��
  - �扯�蝏𤘪�嚗𡁜歇�㗇鸌��䲮獢��銵䕘��祈蔭隞���� create �曉� payload ���牐� create/update �𣂷漱颲寧�蝏煺�嚗䔶��拙��啣�蝡� users handler �硋�隞㚚△�Ｕ��

- [x] 2. 銝� create 頝臬�銵交遬撘� payload ����
  - 憸��蝏𤘪�嚗𡁻��� create �湔𦻖�譍� `values`嚗峕㺿銝箇蒾�滚��𣇉��曉� payload ���𩤃��𣂼��𣂷漱颲寧�皜�苊摨艾��
  - �扯�蝏𤘪�嚗𡁜歇�� `users-action-dialog.submit.ts` 銝剜鰵憓� `buildUserCreatePayload`嚗�� create 頝臬��嗆�銝箸遬撘讐蒾�滚�摮埈挾�𣂷漱��

- [x] 3. 蝏煺� create/update �𣂷漱颲寧�
  - 憸��蝏𤘪�嚗朞悟 create/update 頝臬��賜�餈��蝖桃� payload builder 銝擧���𤣰撠� helper嚗��撠𤏸楝敺���匧蒂�亦�蝏湔擪�鞉𧋦��
  - �扯�蝏𤘪�嚗𡁜歇霈� create/update 銝斗辺頝臬��賡�朞� `users-action-dialog.submit.ts` 銝剔� helper 鈭批枂 payload嚗�僎�峕郊撠� `user-api.ts` 銝� `use-users.ts` �� create 蝐餃��嗆�銝箸遬撘� `CreateUserPayload`��

- [x] 4. �扯�摰𡁜�撉諹�銝𤾸�敶坿扇敶�
  - 憸��蝏𤘪�嚗𡁜��鞟𤌍���隞� lint / 蝐餃�璉��伐�撟嗅銁 `walkthrough.md` 霈啣��祈蔭颲寧�蝏煺�蝏𤘪�銝𦒘��䠷★��
  - �扯�蝏𤘪�嚗𡁜歇撖� `users-action-dialog.tsx`��users-action-dialog.submit.ts`��user-api.ts`��use-users.ts` �羓㮾�單����隞嗆�銵���� `eslint` 撉諹�嚗𣬚��𣈯�朞�嚗𥕦僎�� `walkthrough.md` 霈啣��祈蔭颲寧�蝏煺�蝏𤘪�銝𦒘��䠷★��

## �嗆�蝔喳��批恣霈⊥㟲�對�2026-04-05嚗��蝖株恕嚗�

- [x] 1. �箏��祈蔭�湔㺿颲寧�銝𦒘���漣
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧株��虫�撌脣恣霈∪枂�� 4 蝐餅瓲敹�䔮憸矋�`Save` �嗅�潸��踺��楊璅∪��𥪜𢆡銝��湔�扼����𣂼�����𤩺�頝舐眏�脫擪���撉峕�扳芋�� fail-loudly 瞍�宏嚗𥕦僎�� **Critical / High / Medium** ��𧫴畾菜�銵䕘��踹�銝�甈⊥�批之�孵�憿寧𤌍��
  - �扯�蝏𤘪�嚗𡁜歇�劐��孵���◇摨誩��扯� `Phase A + Phase B`嚗��銝� `Phase C`嚗���𣂼��� / 摰鮋��扳芋�梹�蝏抒賒靽脲��芸𢆡嚗䔶�雿靝蛹�𡒊賒敺�＆霈方��氬��

- [x] 2. �嗆��𡒊垢 `Save` �券�����㚚���
  - 憸��蝏𤘪�嚗𡁶頂蝏���� `server/handlers`��server/services`��server/db` 銝剔凒�乩蝙�� `db.DB.Save()` �𣇉�隞瑕�摮埈挾�湔鰵���頝臬�嚗𥕦��𦦵�摰� JSON -> struct �嗅�� -> Save 閬���渲��萘��曇楝�嫣蛹�賢��訫�畾菜凒�啜��遬撘� PATCH 霂凋��硋��� map/Updates 璅∪�嚗屸俈甇Ｙ��嗵������蝵桅睸����𥪜�畾萇�鋡怨秤皜�征��
  - �扯�蝏𤘪�嚗𡁜歇摰峕� `inventory_command_service.go`��finance.go`��common.go`��sales_orders.go` ����寥�憌𡡞埯�湔㺿嚗𥕦�銝� `finance.go` 銝� `common.go` 撌脰�銝�甇乩��𨀣𤜯�� Save�脲𤣰�𥕢蛹�箔� JSON 摮埈挾�箇緵�抒��笔� PATCH 霂凋�嚗䈣BulkSyncInventory` 銝� `BulkSyncSalesOrdersHandler` 銋笔歇銵乩��埈綉 merge �湔鰵蝑𣇉裦��

 - [x] 3. 撱箇�頝冽芋�𡑒��函�銝��湔�扯器�䕘��嗆挾�批��琜�
  - 憸��蝏𤘪�嚗𡁏４���摮塩��晴�瓐��揣�∠�璅∪�銋钅𡢿���甇亥��券曎嚗諹��徉�𨀣𧋦�唬��∪歇�𣂷漱嚗䔶��𥪜𢆡�湔鰵憭梯揖�萘��剔�嚗𥕢���������撩銝��湔�雿𨀣𤣰����蓥��∟器�䕘��䭾��蓥��⊿𡡒�舐�頝冽芋�𡑒��刻‘朣鞉�蝖桃�銵亙�/�滩�/敺�耨憭滨𠶖����踹�摨枏��𣂼�雿�恥�閗�摨行𧊋�峕郊���韐Ｖ�銝��氬��
  - 敶枏�蝏栞捏嚗𡁜歇摰峕��祈蔭蝔喳��曇楝��凒����嗆挾�扳𤣰���敶枏��舐＆霈� `摨枏� -> 韐Ｗ𦛚�剛�`����揚/���� -> workflow`��workflow -> purchase_orders.status`��RecordInbound -> purchase_order_lines.received_qty / purchase_orders.status`��CommitShipment/VoidShipment -> sales_order_lines.delivered_qty / sales_orders.status` ��歇�嗅藁�啣�摨㮖��∪�嚗�僎撌脣��鞾�頧� handler/�亙藁撅�𦻖蝥輯‘撘箝��
  - 撌脣��𣂼�憿對�撌脫��嘥㦛摰峕� `Blueprint Step 1`嚗峕鰵憓� `server/services/workflow_document_sync_service.go`嚗����揚�訫極雿𨀣��嗆����嗘� `workflow_service.go` 餈�枂銝箇𡠺蝡见�甇亙膥嚗𥕦僎�朞� `go test ./services ./handlers -run "ApproveWorkflowTask|RejectWorkflowTask|PurchaseOrder|SalesOrder|Workflow"` 撉諹�銵䔶蛹�芸���
  - 撌脣��𣂼�憿對�撌脫��嘥㦛�刻� `Blueprint Step 2` ��洵銝��嗆挾嚗峕鰵憓� `purchase_order_flow.go` 銝� `purchase_receipt_service.go`嚗�僎銝� `InboundRecord` 銵亙� `purchaseOrderId + purchaseOrderLineId` �唾�憟𤑳漲嚗𢱌RecordInbound` �啣歇�典�銝�鈭见𦛚��綫餈� `purchase_order_lines.received_qty` 撟園�蝞� `purchase_orders.status`��歇�朞� `go test ./services -run "RecordInbound|PurchaseReceipt|PurchaseOrderStatus"` 撉諹���
  - 撌脣��𣂼�憿對�撌脫��嘥㦛�刻� `Blueprint Step 3` ��洵銝��嗆挾嚗峕鰵憓� `sales_order_flow.go` 銝� `sales_fulfillment_service.go`嚗�僎銝� `ShipmentRecord` 銵亙� `salesOrderId + salesOrderLineId` �唾�憟𤑳漲嚗𢱌CommitShipment` �啣歇�典�銝�鈭见𦛚��綫餈� `sales_order_lines.delivered_qty` 撟園�蝞� `sales_orders.status`��歇�朞� `go test ./services -run "CommitShipment|SalesOrderStatus|SalesFulfillment|RecordInbound|PurchaseReceipt"` 撉諹���
  - 撌脣��𣂼�憿對�撌脰‘朣鞾��桀悼蝥血�皛𡁻曎頝荔�`VoidShipment` �啣歇�典�銝�鈭见𦛚����� `sales_order_lines.delivered_qty` 撟園�蝞� `sales_orders.status`嚗𥕦歇�朞� `go test ./services -run "CommitShipment|VoidShipment|SalesOrderStatus|SalesFulfillment|RecordInbound|PurchaseReceipt"` 撉諹���
  - 撌脣��𣂼�憿對�撌脣��� handler/�亙藁撅�𦻖蝥輯‘撘箝���蝡� `inventory-service.ts` 撌脩宏�斗唂�� `updateOrderDelivery(...)` 銵乩�撘讛��剁�隞枏��箏��𣂷漱瘚���啣歇�譍� `salesOrderId + salesOrderLineId`嚗𥕦�蝡舀鰵憓� `inventory_command_handlers_test.go` 閬�� `RecordInboundHandler` 銝� `RecordShipmentHandler + CommitShipmentHandler` ������霂��撟園�朞� `go test ./handlers ./services -run "RecordInbound|RecordShipment|CommitShipment|PurchaseReceipt|SalesFulfillment|SalesOrderStatus|PurchaseOrderStatus"`���蝡� `pnpm exec tsc --noEmit` �朞���
  - 撌脣��𣂼�憿對�撌脰‘�拇�敶鍦藁���撠誩��典��堆��啣� `logistics_document_sync_service.go`嚗�僎�� `UpdateLogisticsStatusHandler` ���鈭见𦛚��𦻖�� `SyncLogisticsBusinessDocumentTx(...)`嚗𥕦��滚笆��揚�拇� `Receipt` �舐鍂靽嘥��惩�嚗𡁜��拇��嗆����� `InTransit / Delivered` �塚��仿�韐剖�隞滢蛹 `Sent`嚗���刻��� `Awaiting`����桃�瘚���滢���遬撘� `no-op`嚗𣬚誧蝏剔眏 `delivered_qty` 撽勗𢆡���桀悼蝥衣𠶖����踹��嗆��祗銋匧�蝒���歇�朞� `go test ./handlers ./services -run "Logistics|PurchaseReceipt|SalesFulfillment|RecordInbound|RecordShipment|CommitShipment"` 撉諹���
  - 靽萘�憿對��臬炏蝏抒賒撠��韐剔�瘚�綫餈𥕦� `Received`��誑�𦠜糓�虫蛹���桃�瘚�挽霈∠𡠺蝡衤� `delivered_qty` ��虾閫���嗆���撠��靽萘�銝箔�銝�頧桀��喟���凒��
  - 撌脣��𣂼�憿對�撌脣��售�𦦵＆霈斗𤣰韐扳��栽�嘥�蝡臬𦶢隞歹��啣� `purchase_receipt_confirm_service.go` 銝� `ConfirmPurchaseReceipt(...)`嚗�僎隞� `RecordInbound(...)` �賢枂 `recordInboundTx(...)` 靘偦�𡁶鍂�亙�銝𡒊＆霈斗𤣰韐批�鈭恬�撌脫鰵憓� `ConfirmPurchaseReceiptHandler` 銝𡡞�韐剛楝�� `POST /purchase/orders/:id/confirm-receipt` 雿靝蛹霈Ｗ�靘扳��桀�������� `Received` 隞�眏鈭箏極蝖株恕�嗉揮 + 摰鮋��嗉揮�圈�撽勗𢆡嚗𣬚�瘚�𠶖���憭𡁏綫餈𥕦� `Awaiting`��歇�朞� `go test ./handlers ./services -run "ConfirmPurchaseReceipt|PurchaseReceipt|RecordInbound"` 撉諹���
  - 撌脣��𣂼�憿對�撌脣��滨垢��揚霈Ｗ�憿菊�𦦵＆霈斗𤣰韐把�脲��格𦻖�啣�蝡舐＆霈斗𤣰韐批𦶢隞扎��purchase-service.ts` 撌脫鰵憓� `confirmPurchaseReceipt(...)` API 撠��嚗䈣use-purchase.ts` 撌脫鰵憓𧼮笆摨� mutation嚗䈣purchase-order-detail.tsx` 撌脫鰵憓嫰�𦦵＆霈斗𤣰韐把�脲��桀僎�匧��滩恥�訫�雿蹱𧊋�嗆㺭�讛䌊�冽��䭾�鈭� payload嚗𥕦��嗡蛹 `PurchaseOrderLine` 銵亙� `id` 摮埈挾嚗�僎�� `zh-CN/en-US purchase.ts` 銝剛‘朣鞉���/�鞟內/撌脫𤣰�圈������歇�朞� `pnpm exec tsc --noEmit` 銝𡒊𤌍���隞� `eslint` 撉諹���
  - 撌脣��𣂼�憿對�撌脣���揚蝖株恕�嗉揮隞𢛶�靝��桃＆霈文�雿蹱𧊋�嗆㺭�謿�嘥�蝥找蛹�𣈯�鞱��舐�颲𤑳＆霈斗𤣰韐批撕蝒轁�腈��鰵憓䂿𡠺蝡讠�隞� `purchase-receipt-confirm-dialog.tsx`嚗峕𣈲���鞱�蝻𤥁��祆活�嗉揮�圈���鸌甈∪噡銝𡒊𤌍���雿㵪�`purchase-order-detail.tsx` 撌脫㺿銝箇��餅��格�撘�撘寧�嚗�僎�冽�鈭斗��笔��喲𡡒撘寧���鰵憓� `receiptDialog*` �諹祗����𠬍�撌脤�朞� `pnpm exec tsc --noEmit` 銝𡒊𤌍���隞� `eslint` 撉諹���

- [ ] 4. �∪�����亙藁蝑𣇉裦銝擧��罸△�ａ俈�方器��
  - 憸��蝏𤘪�嚗𡁜抅鈭𢛶�𨀣��∠垢銝箸�蝏���喇�萘��Ｘ��笔�嚗���詨�敶枏��臬炏摮睃銁隞��靘扯器�誯��譌����𤩺�憿菟𢒰�㰘蝸�𦒘�隡𡁏𠂔�脫㺭�格��扯��梢埯�其���楝敺��颲枏枂�亙藁�鞟內��△�Ｙ征������∠垢 401/403 �漤�銝𤾸�蝡臬紡�芾�銝箇�蝏煺�蝑𣇉裦��𥅾��憓𧼮��滨垢頝舐眏蝥折獈�哨�敹�◆���蝖桀��胼�𦦵鍂�瑚�撉��靽脲擪�肽�屸�����蠘��喉�撟嗅��砍�瘙��蝖株恕��

- [ ] 5. 銵仿�摰鮋��扳芋�㛖�撘箇𠶖��嵗撉䔶� fail-loudly 銵䔶蛹
  - 憸��蝏𤘪�嚗𡁻��孵恣�� `print-mgmt`��equipment-tooling` 蝑㗇鰵璅∪�銝剔�撘�郊頧株砭����唳�隞扎��𠶖����Ｖ��輸曎頝舀�雿頣�銵仿��滨蔭�嗆��鱏閮����蝡舐𠶖��嵗撉䎚���霂舀遬撘𤩺𠂔�脖��䭾��嗆���甇Ｙ誧蝏剜�銵䕘��踹� silent failure �硋摹�⊿�蝏閗���

 - [ ] 6. 銝粹�憌𡡞埯�湔㺿銵仿�摰𡁜�撉諹�銝𤾸�敶坿扇敶�
  - 憸��蝏𤘪�嚗𡁻�撖寞�銝�蝐餅㟲�寡‘���撠誩虾霂���� handler/service 瘚贝����閬���滨垢蝐餃�/lint �⊿�嚗�僎�� `walkthrough.md` 霈啣�敶勗��Ｕ���霂���栶����䠷★銝𤾸�蝏剖��痹�蝖桐��湔㺿蝏𤘪��臬恣霈～��虾�𧼮���
  - 敶枏�餈𥕦�嚗𡁜歇�啣� `inventory_command_service_test.go`��inventory_command_handlers_test.go` 銝� `save_patch_semantics_test.go` ����穃�敶垍鍂靘页�撟嗅��� `go test ./handlers ./services -run "RecordInbound|RecordShipment|CommitShipment|PurchaseReceipt|SalesFulfillment|SalesOrderStatus|PurchaseOrderStatus"` 銝� `pnpm exec tsc --noEmit` 撉諹�嚗𤤿𤌍���隞� `eslint` 隞�� `src/features/warehouse/services/inventory-service.ts` 銝剜𠳿�厩� `no-console` �桅�嚗䔶�撅硺��祈蔭�啣��桅���

- [ ] 7. 靽桀�敶枏��滨垢 TypeScript 憟𤑳漲瞍�宏銝擧�獢�睸蝻箏仃
  - 憸��蝏𤘪�嚗𡁏��文��齿⏛�曆葉擃条＆摰𡁏�抒��滨垢蝻𤥁��仿�嚗諹秐撠𤏸��碶�蝐駁䔮憸矋�1) `trading.requirements.*` ����桀��其��芾◤霂剛�蝐餃�蝟餌��嗅�嚗峕������辣蝻箏仃撖孵� key嚗�2) `users-add-admin-dialog.tsx` 靚�鍂 `createMutation` �嗆�鈭� payload 蝻箏� `CreateUserPayload.role`嚗�3) 皜��隡湧��箇緵��𤌍���隞嗥漣 lint嚗���芯蝙�典��譌��
  - �煺耨�寞�隞塚�`src/locales/messages/zh-CN/trading.ts`��src/locales/messages/en-US/trading.ts`��src/features/trading/components/requirements/requirement-stats.tsx`��src/features/trading/tabs/index.tsx`��src/features/components/supplier-list.tsx`��src/features/users/components/users-add-admin-dialog.tsx`���閬�𧒄銵亙�霂剛�蝐餃��𡁜��亙藁��
  - 撉諹��孵�嚗帋����銵� `pnpm exec tsc --noEmit`嚗𥡝𥅾��凒��捂嚗��撖寧𤌍���隞嗆�銵� `pnpm exec eslint` 摰𡁜��⊿���

- [ ] 8. 靽桀��啣��� logistics 蝧餉��桐� production-calendar 摰𡁜� lint �仿�
  - 憸��蝏𤘪�嚗𡁏��文��齿⏛�曆葉�啣枂�啁�擃条＆摰𡁏�抒�霂烐𥁒�辷��喳�閬��銝斤掩�桅�嚗�1) `src/features/logistics/types.ts` 銝� `trading.logistics.carriers.*` 撌脰◤憯唳�銝� `TranslationKey`嚗䔶�敶枏�霂剛�蝐餃�蝟餌��芾��怨�鈭偦睸嚗�2) `src/features/production-calendar/components/day-detail-sheet.tsx` 銝� `catch(error)` ��𧊋雿輻鍂�㗛��仿���
  - �煺耨�寞�隞塚�`src/locales/messages/zh-CN/trading.ts`��src/locales/messages/en-US/trading.ts`��src/features/logistics/types.ts`��src/features/production-calendar/components/day-detail-sheet.tsx`嚗��閬�𧒄銵亙�霂剛�蝐餃��𡁜��亙藁��
  - 撉諹��孵�嚗帋����銵� `pnpm exec tsc --noEmit`嚗𥡝𥅾��凒��捂嚗��撖寧𤌍���隞嗆�銵� `pnpm exec eslint` 摰𡁜��⊿���

- [ ] 9. 靽桀� logistics-action-dialog 蝻箏仃�� dialog �����
  - 憸��蝏𤘪�嚗𡁏��文��齿⏛�曆葉 `src/features/logistics/components/logistics-action-dialog.tsx` 撖� `trading.logistics.dialog.*` ���霂烐𥁒�辷�蝖桐�銝剜� `trading.ts` 銝舘㘚���獢����笆朣琜��喳�閬�� `contactLabel`��contactPlaceholder`��phoneLabel`��phonePlaceholder`��cancel`��save` �𠰴�蝥批歇靚�鍂�柴��
  - �煺耨�寞�隞塚�`src/locales/messages/zh-CN/trading.ts`嚗��閬�𧒄撖寧� `src/locales/messages/en-US/trading.ts` �⊿�撅�漣銝��湔�扼��
  - 撉諹��孵�嚗帋����銵� `pnpm exec tsc --noEmit`嚗𥡝𥅾��凒��捂嚗��撖� `src/features/logistics/components/logistics-action-dialog.tsx` 銝𡒊𤌍��祗閮���辣�扯� `pnpm exec eslint` 摰𡁜��⊿���

- [ ] 10. 撱箇� i18n 憟𤑳漲瘝餌�銝� locale 蝏𤘪�銝��湔�扳嵗撉�
  - 憸��蝏𤘪�嚗帋��滢�韏砽�𨀣𥁒�嗘��滩‘ key�萘�鋡怠𢆡靽桀��孵�嚗�遣蝡衤�憟堒虾�冽𧋦�唬� CI �嗆挾�𣂼��𤑳緵銝剛㘚���獢�����蝘餌��⊿��箏�嚗諹秐撠𤏸��吔�1) `zh-CN` 銝� `en-US` �� dot-path 蝏𤘪�銝��湔�改�2) ����������澆��唬��湔�改�3) �朞��𡁏𧋦颲枏枂�𡒊＆蝻箏仃憿對��餅迫蝏抒賒�䭾�瞍�宏��
  - �煺耨�寞�隞塚�`scripts/` 銝𧢲鰵憓墧��拙��⊿��𡁏𧋦��package.json`���閬�𧒄 `.github/workflows/ci.yml`嚗䔶誑�𠰴����輯蝸憭滨鍂�餉��嗆鰵憓䂿𡠺蝡见極�瑟�隞塚��踹��湔𦻖�孵𢆡����∠�隞嗚��
  - 撉諹��孵�嚗𡁏�銵峕鰵憓墧嵗撉諹��研��pnpm exec tsc --noEmit`嚗�僎�寞旿�亙��寡‘���撠誩�撉諹�嚗���格��𡁏𧋦 eslint �� CI �滨蔭�蹱����伐���

- [ ] 11. 皜����蟮 i18n baseline �箏𦛚撟園�鞉郊�讠憬�� 0
  - 憸��蝏𤘪�嚗𡁜抅鈭� `scripts/i18n-parity-baseline.json` 銝剖��滩扇敶閧� 33 憿孵��脣榆撘���㗇芋�堒��寞���葉�望� locale 蝏𤘪�瞍�宏嚗屸�鞉郊�� baseline �讠憬�� 0嚗諹�䔶��舐誧蝏剝鵭�笔捆敹滚��脣�箏𦛚��
  - ��鸌蝑𣇉裦嚗�
    - 蝚砌��對�`users` + �嗆袇�閧�嚗ǑbasicSettings`��engineering`嚗�
    - 蝚砌��對�`trading.requirements` �鞟�撌桀�
    - 蝚砌��對�`orgPersonnel` �鞟�撌桀�
  - �煺耨�寞�隞塚�撖孵��� `src/locales/messages/zh-CN/*.ts`��src/locales/messages/en-US/*.ts`嚗��閬�𧒄�瑟鰵 `scripts/i18n-parity-baseline.json`嚗䔶�銝齿㺿�其��∠�隞嗚��
  - 撉諹��孵�嚗𡁏��孵��𣂼��扯� `pnpm run verify:i18n` 銝� `pnpm exec tsc --noEmit`嚗峕��𤾸��� baseline 撟嗥＆霈文��脣榆撘���嗚��

- [ ] 12. Phase 2嚗𡁜�蝡胼�𣈯妟摰∟恣�脲��鞉沲��蓮��
  - 憸��蝏𤘪�嚗𡁜蝠摨閧宏�文�蝡臬抅鈭� `admin` / `superadmin` / `role` ��𦆮���餉�嚗諹悟�滨垢摰�㪗�芣�銵��蝡� `/profile` 銝见��� `permissions` �文�嚗偦△�Ｚ挪�桀銁頝舐眏撅���𣂼�蝵格㜃�迎�撖潸⏛�亙藁銝𡡞△�Ｘ��桃�銝��望��� ID �訫蔣嚗䔶��滨眏�滨垢�芣�閫�������
  - ��郊皜��嚗�
    - ��𤣰�𥟇��𣂼ế摰𡁜��賂�蝘駁膄 `isSystemAdmin`��isSuperAdmin`��hasAuthSessionPermission` 銝剔�閫坿𠧧�剛楝銝舘���𦆮銵䎚��
    - �滚遣蝡贝楝�梁漣���摰�㪗嚗帋蛹�𦯀��日△�Ｗㄟ�� `requiredPermission`/`requiredAnyPermissions`嚗屸�朞� TanStack Router `beforeLoad` �函�隞嗆�頧賢��扯��行⏛��
    - �滨�銝�撖潸⏛銝𡡞△�Ｗ虾閫��改�`AppSidebar`��abs��△�Ｙ漣�亙藁����桃漣�其��券�憭滨鍂�䔶�憟� `permissionId` �文���瓲��
    - ���擧𤣰�𥕦�甇交𧒄摨𧶏�蝖桐� `AuthenticatedLayout` / 霈方�憯喳銁 access snapshot �� ready �園�霈斗�蝏嘅��䔶��臬�皜脫��𤾸��嗚��
  - �煺耨�寞�隞塚�`src/components/layout/app-sidebar.tsx`��src/components/layout/authenticated-layout.tsx`��src/features/authz/utils/auth-session.ts`��src/features/authz/hooks/use-permission-access.ts`��src/features/authz/guards/route-access.ts`��㮾�� `src/routes/_authenticated/**` 頝舐眏��辣嚗��閬�𧒄銵亙��祉���楝�望��鞉釣�諹”�𡝗��𣂼��怠極�瑟�隞嗚��
  - 撉諹��孵�嚗朞秐撠烐�銵� `pnpm exec tsc --noEmit`嚗𥕦�摰墧鴌摰峕��𡡞�銵亙�摰𡁜�頝舐眏/����𧼮�撉諹�嚗諹��砽�𨀣������蝸憿菟𢒰�������曄內撖潸⏛�����虾霈輸䔮銝𥪯�靘肽�閫坿𠧧摮㛖泵銝脫𦆮銵𢞖�苷�蝐餃㦤�胯��
  - 敶枏�蝥行�嚗𡁏𧋦憿寧𤌍�滢�摰峕��寞�銝舘器�𣬚＆霈歹��其��𡒊＆�孵�摰墧鴌霈∪��㵪�銝滚�憪衤耨�嫣�餈唬��∩誨����

- [ ] 13. Phase 2 �嗅偏嚗𡁜��� lint / �批�箏��烐祥��
  - 憸��蝏𤘪�嚗𡁜銁銝齿�憭找蛹�典��齿�����𣂷�嚗峕𤣰�𥟇𧋦頧格��鞉㺿�㰘�蝔衤葉�擧遬�湧蠧���隡𡁏�蝏剖僕�啣�蝏剔輕�斤���蟮 lint / �批�綽��滨�憭���𨀣��祈蔭�啣��孵𢆡�湔𦻖�唾����隞嗯�嘥��𨅯蔣�齿��𣂼���曎頝臬虾蝏湔擪�把�萘��桅���
  - ��郊皜��嚗�
    - ����劐��祈蔭����曇楝�湔𦻖�詨�����脤䔮憸矋��𣂼��典紡�芸�����𤐄摰𡁶𤌍��楝�勗�������鞟㮾�喟���/�滨蔭憿萄𪂹颲寞�隞嗚��
    - 隡睃�憭��雿𡡞��拚䔮憸矋��滚� import���蝐餃� import����� `any`��𤐄摰𡁶𤌍�����撩撠烐��鞉�敶晞��虾撅��刻��渡� effect/Hook 憿箏��桅���
    - �𡒊＆靽萘�憿對�銝滚�����祈蔭�惩���甅撘讐掩�滚遣霈柴����臬𢆡�典� `any` 皜�妟����拙�銝粹�𡁶鍂銵典��𣇉頂蝏毺��折�����
    - 摰峕��𤾸�甈⊥�銵���烐嵗撉�僎銵亙���﹝霈啣���
  - �煺耨�寞�隞塚�隡睃���� `src/features/system-mgmt/monitor/components/system-anomaly-banner.tsx`��src/features/basic-settings/tabs/dm-numbering-mgmt.tsx`��src/features/warehouse/components/shipment-history.tsx`��誑�𦠜𧋦頧格��𣂼����敶梁㮾�單�隞塚�憒���乩葉�𤑳緵�嗡�銝擧𧋦頧桀���曎頝臬撩�詨���𤌍����滚���凒銵亙���
  - 撉諹��孵�嚗朞秐撠烐�銵� `pnpm exec tsc --noEmit` 銝� `go test ./handlers -run ^$`嚗𥕦���凒��捂嚗��撖寧𤌍���隞嗅�摰𡁜� `eslint` �⊿���
  - 憌𡡞埯颲寧�嚗𡁏𧋦憿嫣��尠�憕hase 2 �嗅偏瘝餌��嘅�銝齿��祈蔭���隞餃𦛚�拙�銝箏�隞� lint 皜�妟�㚚�𡁶鍂�嗆���漣��

- [ ] 14. Phase 2 �嗅偏銵亙�嚗𡁜�雿蹱甅撘讐掩�� warning 摰𡁜�皜��
  - 憸��蝏𤘪�嚗𡁏������ IDE �𡒊＆�堒枂���雿蹱甅撘讐掩�� warning嚗䔶��𡁶�隞� Tailwind 蝐餃��踵揢嚗䔶��孵�蝏�辣蝏𤘪�����⊿�餉��𡝗��鞾曎頝航�銝箝��
  - ��郊皜��嚗�
    - 隞���� `@[current_problems]` 銝剖��箇� 8 銝� warning��
    - 隞�𤜯�Ｙ�隞瑞掩�㵪�靘见� `z-[100] -> z-100`��bg-[length:200%_100%] -> bg-size-[200%_100%]`��bg-gradient-to-b -> bg-linear-to-b`��bg-emerald-500/[0.06] -> bg-emerald-500/6` 蝑剹��
    - 銝齿鰵憓墧鰵�� lint �格�嚗䔶�憿箸�憭���芸��箇� warning �𡝗甅撘誯�����
  - �煺耨�寞�隞塚�`src/features/basic-settings/tabs/dm-numbering-mgmt.tsx`��src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`��src/features/equipment-tooling/components/mold-action-dialog.tsx`��src/features/system-mgmt/monitor/components/system-anomaly-banner.tsx`��src/features/terminal-config/tabs/pda-terminal.tsx`��
  - 撉諹��孵�嚗𡁜笆銝𡃏膩�格���辣�扯�摰𡁜� `eslint`嚗�僎銵亙�銝�甈� `pnpm exec tsc --noEmit` 蝖株恕�惩�雿𦦵鍂��
  - 憌𡡞埯颲寧�嚗𡁏𧋦憿嫣��𡁶掩�滨�隞瑟𤜯�ｇ�銝齿㺿 UI 霂凋�嚗䔶��拙�銝箄�閫厰�����

- [ ] 15. Phase 2 �嗅偏銵亙�嚗䮝da-terminal ��蟮 no-console 皜��
  - 憸��蝏𤘪�嚗𡁏��� `src/features/terminal-config/tabs/pda-terminal.tsx` 銝剖��漤獈憛𧼮��� `eslint` �� 2 憭� `no-console`嚗屸��冽�撠𤩺㺿�函宏�方�霂閗��箸��嫣蛹�墧綉�嗅蝱摰䂿緵嚗䔶��孵� PDA 撌乩��圈△�Ｚ�銝箝��
  - ��郊皜��嚗�
    - 隞���� `pda-terminal.tsx` 敶枏��湧蠧�� 2 憭� `console.*`��
    - 銝齿�撅訫��嗡� `terminal-config` ��辣��
    - 憒��靽萘��躰秤靽⊥�嚗䔶���鍂銝滩圻�� `no-console` ���隞瑕���䲮撘譌��
  - �煺耨�寞�隞塚�`src/features/terminal-config/tabs/pda-terminal.tsx`��
  - 撉諹��孵�嚗𡁜笆霂交�隞嗆�銵���� `eslint`嚗��銵亙�銝�甈� `pnpm exec tsc --noEmit`��
  - 憌𡡞埯颲寧�嚗𡁏𧋦憿嫣��𡁏𤣰撠暹��迎�銝滩��� PDA 憿菟𢒰銝𡁜𦛚�餉��碶漱鈭㘾曎頝胯��

- [ ] 16. �滨垢�亙�瘝餌� / lint 閫��瘝餌�
  - 憸��蝏𤘪�嚗帋��漤�朞��𨅯��唬�銝� `console` �牐�銝芬�萘��孵�鋡怠𢆡瘨�臁嚗諹�峕糓撱箇�銝�憟堒�蝡舀𠯫敹堒枂��� lint/CI 閫��嚗峕�蝖桀𪑛鈭𥟇𠯫敹堒�霈詨��具��𪑛鈭𥕦�憿餌�銝��嗆�嚗�僎霈拙�蝏剖�蝐駁䔮憸䁅��典��烐��𣂷漱瘚��銝剛◤�𣂼��行⏛��
  - ��郊皜��嚗�
    - ��４���蝡舐緵�� `console.*` ���撣���鍂�𥪯�撅�漣嚗�△�Ｚ�霂𨰻���霂臬�摨𨰻��㺭�株��准��鍳�冽��剛�蝑㚁���
    - �滚�銋匧�蝡舀𠯫敹㛖��伐�憿菟𢒰/蝏�辣撅��霈斤�甇Ｙ凒�� `console`嚗��閬�𠯫敹㛖�銝�韏啣��批枂���撘��烐�����霂閙�����撱箸���颲寧�閬��蝖柴��
    - �滩挽霈� lint 閫��瘝餌��寞�嚗𡁏糓蝏抒賒雿輻鍂�唳� `no-console`嚗諹��舀㺿銝箏��桀�/��祗銋㕑��辷��踹��𨅯蘨�牐犖撌交𤣰撠撾�腈��
    - 憒��敹��嚗��銵亙� CI �𤥁��祆嵗撉䕘�霈抵�閫�𠯫敹堒銁�𣂷漱�滚虾閫���
    - 敺�䲮獢�繮�孵�嚗���㗇祥��䲮獢���踝��䔶��舐誧蝏剖笆�閙�隞嗆�銵乩���
  - �煺耨�寞�隞塚�隡睃�銝箄��雴�瘝餌��寞���﹝嚗𥕦�餈𥕦�摰墧鴌�嗆挾嚗����� `eslint.config.js`��package.json`��scripts/`��誑�𦠜鰵憓𧼮�蝡舀𠯫敹堒極�瑟�隞塚��亦＆�匧�閬����
  - 撉諹��孵�嚗𡁜�隞交䲮獢�恣�嫣蛹���摰墧鴌�嗆挾�喳�閬��摰𡁜� `eslint`��pnpm exec tsc --noEmit`嚗��閬�𧒄銵亙� lint/�𡁏𧋦�賭誘撉諹���
  - 憌𡡞埯颲寧�嚗𡁏𧋦憿寞糓�𨀣祥��遙�﹦�嘅�銝齿糓蝡见��其��踵揢�亙�嚗𥕦銁雿䭾鸌����賣䲮獢��嚗䔶�蝏抒賒靽格㺿銝𡁜𦛚隞��銝剔� `console`��

- [ ] 17. �滨垢�亙�瘝餌�蝚砌��嗆挾嚗𡁜�隞𤘪𤜯�� / scripts-tests ��� / CI / �滚��亙�撟喳蝱
  - 憸��蝏𤘪�嚗𡁜銁蝚砌��嗆挾��撠誯𡡒�臬抅蝖�銝𠺪�餈𥕦���迤��祥����ａ𧫴畾蛛�銝滚��𦦵��刻��對�摰峕��滨垢銝𡁜𦛚隞��銝剜袇�� `console` ��頂蝏��扳𤜯�ｇ�撱箇� scripts/tests 銝𦒘��∩誨���撅���辷��𦠜嵗撉峕𦻖�� CI嚗�僎霂�摯/�亙��滚��亙�撟喳蝱���撠誩虾餈鞱��賢���
  - ��郊皜��嚗�
    - �其��急�撟嗅��寞𤜯�Ｗ�蝡臭��∩誨��葉�� `console.*`嚗䔶���△��/蝏�辣撅���� hooks/services嚗���箇�霈暹鴌撅���
    - 銝� `scripts/**`���霂閙�隞嗡��滨垢銝𡁜𦛚隞��撱箇���� lint 閫��嚗屸��滨誧蝏剖��其�������嗚��
    - 撠�𠯫敹埈祥��嵗撉峕𦻖�� `package.json` �賭誘銝� CI嚗屸��滚�蝏剖�甈⊿�鈭箏極�怠偏��
    - 霈曇恣撟嗉�隡圈��𧢲𠯫敹堒像�唳𦻖�交䲮獢���喳��𡒊＆靘𥕦�����𦻖�亥器�䎚����煺縑�航��讐��乩��臬�撘��喉��瑟鸌�𤾸��𡁏�撠誩��啜��
    - 摰峕��舘‘���獢��撉諹�霈啣�嚗�耦�𣂼虾��賒�扯���祥�������
  - �煺耨�寞�隞塚�`eslint.config.js`��package.json`��.github/workflows/ci.yml`��scripts/` 銝𧢲祥����研���蝡舀𠯫敹㛖㮾�喳�鈭怠極�瑟�隞塚�隞亙���鸌餈�宏�賭葉���蝡臭��⊥�隞塚�憒�𦻖�仿��𧢲𠯫敹堒像�堆���銵亙��臬��㗛�霂湔�銝擧𦻖�交�獢���
  - 撉諹��孵�嚗朞秐撠烐�銵����/�典� `eslint`��pnpm exec tsc --noEmit`��鰵憓墧𠯫敹埈祥����穿�憒�𦻖�� CI嚗��撉諹�撌乩�瘚��蝵殷�憒�𦻖�仿��𧢲𠯫敹堒像�堆��躰‘���撠讛��𡁻�霂���滨漣蝑𣇉裦霂湔���
  - 憌𡡞埯颲寧�嚗𡁏𧋦憿孵�鈭擧��Ｘ祥����航�敶勗��滨垢憭𡁏芋�𦯀�撌亦��滨蔭嚗𥕦銁雿䭾�蝖格鸌����賣䲮獢��嚗䔶�撘�憪衤耨�嫣�餈唬��∩誨���撌亦��⊿��曇楝��

- [ ] 18. 敶枏��瑕�蝐餃� warning 摰𡁜�皜��嚗��蝖株恕嚗�
  - 憸��蝏𤘪�嚗帋�皜��雿惩��� IDE �Ｘ踎�堒枂�� Tailwind 蝐餃� warning嚗𣬚＆靽苷��臭誑蝏抒賒銝𠹺��滚𦛚�券�霂��銝齿�����嗅� lint��掩�钅䔮憸䀹�銝𡁜𦛚隞���齿���
  - ��郊皜��嚗�
    - 隞���� `@[current_problems]` 銝剖��箇� warning��
    - 隞��蝑劐遠蝐餃��踵揢嚗䔶�憒��
      - `bg-gradient-to-b -> bg-linear-to-b`
      - `rounded-[2rem] -> rounded-4xl`
      - `z-[100] -> z-100`
      - `bg-[length:200%_100%] -> bg-size-[200%_100%]`
      - `bg-gradient-to-br -> bg-linear-to-br`
      - `bg-gradient-to-r -> bg-linear-to-r`
      - `dark:hover:bg-white/[0.06] -> dark:hover:bg-white/6`
      - `dark:bg-white/[0.08] -> dark:bg-white/8`
      - `dark:bg-white/[0.06] -> dark:bg-white/6`
      - `bg-emerald-500/[0.06] -> bg-emerald-500/6`
      - `bg-amber-500/[0.06] -> bg-amber-500/6`
    - 銝滚���𧊋�堒枂�� warning嚗䔶�憿箸�靽格㺿憿菟𢒰蝏𤘪���甅撘讛祗銋㗇�銝𡁜𦛚�餉���
  - �煺耨�寞�隞塚�
    - `src/features/basic-settings/tabs/dm-numbering-mgmt.tsx`
    - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
    - `src/features/system-mgmt/monitor/components/system-anomaly-banner.tsx`
    - `src/features/system-mgmt/notifications/components/notification-center.tsx`
    - `src/features/terminal-config/tabs/pda-terminal.tsx`
    - `src/features/users/components/users-multi-delete-dialog.tsx`
  - 撉諹��孵�嚗帋����銵𣬚𤌍���隞嗅��� `eslint`嚗𥕦��䭾鰵憓𧼮�雿𦦵鍂嚗��銵乩�甈� `pnpm exec tsc --noEmit`��
  - 憌𡡞埯颲寧�嚗𡁏𧋦憿孵蘨�𡁶掩�滨�隞瑟𤜯�ｇ�銝滢耨�寧�隞嗉�銝綽�銝齿�撅訫��其��瑕�瘝餌���
  - ��凒銵亙�嚗�歇蝖株恕嚗㚁��亙��� `eslint` 隞�� `src/features/system-mgmt/notifications/components/notification-center.tsx` ��𠳿�� `consistent-type-imports` / `no-explicit-any` �躰秤嚗����捂�典���辣�����撠讐掩�𧢲𤣰�𨥈�撣桀𨭌�祈蔭�格���辣�⊿��朞�嚗𥕢��拙��啣�摰��隞嗆��𡁶鍂蝐餃�瘝餌���

- [ ] 19. 敶枏�銝𠹺��餃�蝻𤥁��躰秤摰𡁜�靽桀�嚗��蝖株恕嚗�
  - 憸��蝏𤘪�嚗帋�靽桀�敶枏��芸㦛銝剝獈憛硺�隡删�擃条＆摰𡁏�� TypeScript 蝻𤥁��躰秤嚗諹悟�滨垢�齿鰵�𧼮��舀�撱箇𠶖���銝齿�撅訫��惩� lint �硋�隞梶掩�𧢲祥����
  - ��郊皜��嚗�
    - 靽桀� `src/features/warehouse/services/inventory-service.ts` 銝剖仃���霂剛�靘肽�撘閧鍂��𧊋摰帋�蝐餃�/撣賊�銝擧𧊋雿輻鍂 import��
    - 靽桀� `src/routes/_authenticated/terminal-config/pda.tsx` 銝剖笆 `pda-terminal` ���霂臬紡�箏��具��
    - 靽脲�銝𡁜𦛚�餉�銝滚�嚗䔶��𡁏�撠誩�摰嫣耨憭溻��
  - �煺耨�寞�隞塚�
    - `src/features/warehouse/services/inventory-service.ts`
    - `src/routes/_authenticated/terminal-config/pda.tsx`
    - 憒��餈賣滲撖澆枂摰帋�嚗���芾粉璉��� `src/features/terminal-config/tabs/pda-terminal.tsx`
  - 撉諹��孵�嚗帋����銵� `pnpm exec tsc --noEmit`嚗𥕦���凒��捂嚗��撖寧𤌍���隞嗆�銵���� `eslint`��
  - 憌𡡞埯颲寧�嚗𡁏𧋦憿嫣��嫣��冽��∩��∟祗銋㚁�銝漤��� i18n 雿梶頂嚗䔶��拙��� terminal-config �嗡�憿菟𢒰��

- [ ] 20. 敶枏� ai-assistant logger �芸�銋㗇�撱粹�霂臬��睲耨憭㵪�敺�＆霈歹�
  - 憸��蝏𤘪�嚗帋�靽桀�敶枏���遣颲枏枂銝� `provider-client.ts` 銝� `ai-access-control.tsx` �� `logger` �芸�銋厰�霂荔��Ｗ��滨垢��遣�朞�嚗𥕢��拙��� ai-assistant �嗅��齿���
  - ��郊皜��嚗�
    - 璉��� `src/features/ai-assistant/services/provider-client.ts` �臬炏蝻箏� `createLogger` 撖澆��� `logger` 摰硺�憯唳���
    - 璉��� `src/features/ai-assistant/tabs/ai-access-control.tsx` �臬炏蝻箏� `createLogger` 撖澆��� `logger` 摰硺�憯唳���
    - 隞�‘朣𣂼��齿�隞嗆������撠誩�銋㚁�銝齿㺿銝𡁜𦛚�餉�銝舘��刻祗銋剹��
  - �煺耨�寞�隞塚�
    - `src/features/ai-assistant/services/provider-client.ts`
    - `src/features/ai-assistant/tabs/ai-access-control.tsx`
  - 撉諹��孵�嚗帋����銵� `pnpm exec tsc --noEmit`嚗𥕦���凒��捂嚗��撖寡�銝支葵�格���辣�扯�摰𡁜� `eslint`��
  - 憌𡡞埯颲寧�嚗𡁏𧋦憿嫣��� AI �拇�霂瑟��餉�����鞾�餉��㚚�霂閧��伐��芣�憭滨撩憭梁� logger 蝏穃���

## 蝏煺� 403 Forbidden 憿菟𢒰�� / 蝏�辣�����曎頝荔�2026-04-05嚗��蝖株恕嚗�

- [ ] 21. �箏��祈蔭 403 瘝餌�颲寧�銝舘��喳���
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧桀蘨撱箇��𨅯�蝡� 403 -> �滨垢蝏煺���緵�萘��剔㴓嚗䔶�撘訫��滨垢頝舐眏蝖祆㜃�迎�銝滩悟�滨垢�齿鰵�瑕����閫������
  - ��凒�笔�嚗𡁻△�Ｗ虾餈𥕦�嚗䔶��笔��唳旿/�其�霂瑟��亥◤�𡒊垢�垍�嚗��蝡臬�憿餌�銝�皜脫���� Forbidden 憿菟𢒰�����隞嗆����鞟內���`401` 蝏抒賒韏啁蒈敶閙��仃��曎頝荔��亙枂�售�𦦵頂蝏毺恣���銋蠘��� 403�嘅��坔�憿餌誧蝏剛蕭�交��𣂷���/敹怎�/�𡒊垢�𡁜��曇楝嚗諹�䔶��臬蘨�𦦵��典�蝡舫�霂臬�蝷箏���

- [ ] 22. 璇喟�撟嗆𤣰��緵�� 401/403 �躰秤�亙藁
  - 憸��蝏𤘪�嚗朞��� `apiFetch`��eact Query `queryCache/mutations`��△�Ｙ漣 `error/empty` 皜脫�銝擧𠳿�� `ForbiddenError` 蝏�辣銋钅𡢿��鱏撅���𡒊＆蝏煺�瘨�晶�嫣�韐�遙颲寧���
  - 敶枏��啁𠶖嚗𡁜歇�𤑳緵憿寧𤌍銝剖歇�� `src/features/errors/forbidden.tsx`��src/routes/(errors)/403.tsx`��src/routes/_authenticated/errors/$error.tsx` 隞亙� `src/lib/api-client.ts`��src/lib/handle-server-error.ts` 蝑厰�霂臬����雿���芸耦�鞟�銝� 403 憿菟𢒰�� / 蝏�辣���霈柴��

- [ ] 23. �埝䰻�𦦵頂蝏毺恣���銋� 403�萘��孵��曇楝
  - 憸��蝏𤘪�嚗𡁏�蝖桅䔮憸条弦蝡笔��笔銁�𡒊垢�芯��烐��僐���蝡臭蝙�其�餈��/蝻箸����敹怎�����臬�蝡舐頂蝏毺恣���閫坿𠧧�惩�/����𡁜��祈澈摮睃銁蝻箏藁嚗屸��齿��孵��桅�隡芾��𣂼�蝥舐�撅閧內隡睃���
  - �埝䰻�滨�嚗䫤/profile` �𣇉�����𣂼翰�扯��𧼮�摰嫘���蝡� auth sto- [x] 3. �𡒊垢�滚𦛚撅� (Services) 瘛勗漲皜��
  - [x] 蝘駁膄 `server/services/service_runtime.go` 銝剔� `auditLogger` �亙藁�� `defaultAuditLogger` 摰䂿緵��
  - [x] �齿� `ProductionService`嚗𡁶宏�� `auditLogger` ���惩��啜���畾萄����� `.Write()` 靚�鍂��
  - [x] �齿� `OrganizationService`嚗𡁶宏�� `auditLogger` 靘肽���
  - [x] 皜�� `OrganizationService` 銝剔��𦦵滲摰∟恣�券�婙�萘�霈∩誨�� (憒��created/changed 霈⊥㺭��ummary ��遣)��
  - [x] 敶餃�皜�膄 `server/services/audit_service.go` ���摰嫘��

- [x] 4. �訫�瘚贝� (Tests) 皜��
  - [x] �拍�皜�膄 `bulk_sync_contract_test.go`, `bulk_sync_users_test.go`, `delete_audit_test.go`��
  - [x] 蝘駁膄 `production_service_test.go` 銝� `organization_service_test.go` 銝剔� `fakeAuditLogger`��

- [x] 5. �滨垢蝣𡒊��砽�𨅯恣霈﹦�嗪�餉�皜��
  - [x] 霂��撟嗅��斗��劐�靚�鍂 `/api/audit` �碶�韏� `models.AuditLog` ��△��/蝏�辣 (蝏𤩺䰻嚗䔶��∪��脩�隞嗅� `ShipmentHistory` 鈭�誑靽萘�)��
  - [x] 蝖桐��滨垢�賡��𡝗�獢�葉銝滚���鉄撌脣�撘�恣霈∪��賜㮾�喟��讛膩��

- [x] 6. ��蝏��蝟餌��𧼮�撉諹�
  - [x] �典��𦦵揣 `AuditLog`, `AuditEntry`, `WriteAuditLog` 蝖株恕 0 �寥���
  - [x] �扯� `go build ./...` 蝖株恕�删�霂煾�霂胯��
  - [x] �扯� `pnpm exec tsc --noEmit` 蝖株恕�滨垢�惩��冽��踺��
嫘����啜���甇乓��紡�箇��其��� mutation嚗䔶誑�𠰴��典躹��㺭�桀��亥砭��

- [ ] 26. 摰帋� 401 / 403 / 404 / 500 ���蝡臬��啣�撅�
  - 憸��蝏𤘪�嚗𡁶�銝��躰秤���嚗屸��齿� `403` 瘛瑕��𡁶鍂�躰秤 toast �𣇉征���餉���
  - ����格�嚗䫤401` 韏唬�霂嘥仃����餃�頝唾蓮嚗𢱌403` 韏� Forbidden ��緵嚗𢱌404` 韏啗�皞𣂷�摮睃銁�𣇉征蝏𤘪�撌桀��硋����`500` 韏圈�𡁶鍂�滚𦛚�典�撣賊△/�鞟內��

- [ ] 27. 銵仿�摰𡁜�撉諹�銝𤾸�敶坿扇敶�
  - 憸��蝏𤘪�嚗朞秐撠𤏸��砽�𣈯△�Ｖ蜓�亥砭 403�吲�𦦵�隞嗅𢆡雿� 403�吲�𨅯��冽䰻霂� 403�吲�𦦵頂蝏毺恣���韐血噡銝滚�鋡怨秤�支蛹 403�吲��401 隡朞�憭望��曇楝銝滚�敶圝�苷�蝐餃㦤�荔�撟嗅銁 `walkthrough.md` 霈啣��䀹凒�嫘���霂���靝�靽萘�憿嫘��
  - 撉諹��孵�嚗帋����銵��蝡� `tsc` / 摰𡁜� `eslint`嚗𥕦�摰墧鴌��凒瘨匧��喲睸�躰秤瘨�晶 helper嚗�虾銵交�撠誩����霂閙�憿菟𢒰蝥找犖撌亙�敶坿秩�汿��

## 憿菟𢒰蝥� 403 甇���亙��嗅偏嚗�2026-04-05嚗��蝖株恕嚗�

- [x] 28. �箏��祈蔭�嗅偏��凒銝擧�銵屸◇摨�
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧桐�憭�� 7 銝芬�𦦵�摰鮋△�Ｖ蜓�亙藁 + 摮睃銁 authoritative 銝餃�頧� + 撠𡁏𧊋�亙�甇�� `ForbiddenState`�萘�憿菟𢒰嚗䔶��拙��� dialog����典�蝏�辣����� fallback �硋ㄢ憿菟𢒰��
  - �格�憿箏�嚗䫤src/features/terminal-config/tabs/pda-terminal.tsx`��src/features/terminal-config/tabs/pda-shell.tsx`��src/features/finance/tabs/payment-terms-tab.tsx`��src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx`��src/features/equipment-tooling/tabs/drawing-mgmt.tsx`��src/features/equipment-tooling/tabs/partner-mgmt.tsx`��src/features/finance/tabs/taxation-tab.tsx`��
  - �扯�蝏𤘪�嚗𡁜歇�㕑砲憿箏�摰峕� 7 銝芷△�Ｙ�憿菟𢒰蝥� 403 甇���亙�嚗��銝� `terminal-config` ���嚗䈣finance` 銝� `equipment-tooling` �誩��嗅偏��

- [x] 29. �嗆� terminal-config 銝支葵憿菟𢒰��蜓�㰘蝸 403 憿菟𢒰��
  - 憸��蝏𤘪�嚗帋蛹 `pda-terminal.tsx` �� `loadProtocolConfig()` 銝� `pda-shell.tsx` �� `loadConfig()` 撱箇�蝏煺� `error` �嗆���敶㮖蜓�㰘蝸餈𥪜� `403` �塚��湧△�曄內 `ForbiddenState`嚗𤤿氖蝥輸��𨰜����柴��ake lock����刻�銵峕���靽脲��蠘祗銋㚁�銝滚�蝥找蛹�湧△ Forbidden��
  - �扯�蝏𤘪�嚗𡁜歇銝� `pda-terminal.tsx` 銝� `pda-shell.tsx` 憓𧼮�憿菟𢒰蝥折�霂舀𤣰���隞���讛悅�滨蔭銝餃�頧質��� `403` �嗆㟲憿菜遬蝷� `ForbiddenState`嚗諹�銵峕��曎頝臭�����塩��

- [x] 30. �嗆� finance 銝支葵憿菟𢒰��蜓�㰘蝸 403 憿菟𢒰��
  - 憸��蝏𤘪�嚗帋蛹 `payment-terms-tab.tsx` 銝� `taxation-tab.tsx` 撱箇���� `useState<unknown>(null)` �躰秤�嗅藁嚗𢱌loadData()` 霂��銝餃�頧� `403` 撟嗆遬蝷� `ForbiddenState`嚗𥕢�摮塩���颲㻫��oast 銝擧𠳿�� mutation 霂凋�靽脲�銝滚���
  - �扯�蝏𤘪�嚗𡁜歇銝箔舅憿菜𦻖�乩蜓�㰘蝸 `403 -> ForbiddenState`嚗𥕦�銝� `payment-terms-tab.tsx` �峕郊靽桀�鈭���� `catch` �𡒊誧蝏剜��嗵��剛�憭���孵���

- [x] 31. �嗆� equipment-tooling 銝劐葵憿菟𢒰��蜓�㰘蝸 403 憿菟𢒰��
  - 憸��蝏𤘪�嚗帋蛹 `mold-loan-mgmt.tsx`��drawing-mgmt.tsx`��partner-mgmt.tsx` 撱箇�隞仿�撅� `Promise.all(...)` / `getPartners()` 銝� authoritative source ��△�Ｙ漣�躰秤�嗅藁嚗𢱌403` �嗆遬蝷� `ForbiddenState`嚗屸� `403` 隞滢��坔��匧��券�霂舀�蝷箝��征��� retry 霂凋���
  - �扯�蝏𤘪�嚗𡁜歇摰峕�銝厰△�亙�嚗𥕦僎銵䔶蜓�㰘蝸憿菟𢒰蝏煺��嗅藁�圈△�Ｙ漣�躰秤�嗆���`partner-mgmt.tsx` 隞滢��嗵緵�厰� `403` �躰秤�∠�銝� retry��

- [x] 32. 靽脲��其�蝥扯祗銋劐�撅��� fallback 銝滚�
  - 憸��蝏𤘪�嚗𡁏鰵憓𠺶���颲㻫����扎���鈭扎����𠺶����烾�霂𨰻��𠯫敹埈䰻�卝���隞嗡�隡删� mutation/toast 靽脲��唳��餉�嚗𥕢��𣂼��𣈯△�ａ�撅譍蜓�㰘蝸 `403`�嘥��湧△ `ForbiddenState`嚗䔶��𠰴��刻��拙�頧質秤��聢��
  - �扯�蝏𤘪�嚗𡁏𧋦頧格𧊋靚�㟲 mutation / toast / retry / 銝𠹺� / �亙��亦�蝑匧𢆡雿𦦵漣�曇楝嚗𥕢�銝𦠜筑憿菟𢒰銝餃�頧� `403` �唳㟲憿� `ForbiddenState`��

- [x] 33. �扯�摰𡁜�撉諹�銝𡒊掩�𧢲嵗撉�
  - 憸��蝏𤘪�嚗朞秐撠穃��鞉𧋦頧桐耨�寞�隞嗥�摰𡁜� `eslint` 銝𦒘�甈� `pnpm exec tsc --noEmit`嚗𥕦�摮睃銁�芾粉�舐鍂��△�Ｙ漣鈭箏極撉諹��對��躰‘��扇敶𨰝�靝蜓�㰘蝸 `403` �曄內 ForbiddenState��𢆡雿𦦵漣銵䔶蛹靽脲�銝滚��萘�蝏𤘪���
  - �扯�蝏𤘪�嚗𡁜歇�扯� `pnpm exec eslint`嚗�7 銝芰𤌍���隞塚�銝� `pnpm exec tsc --noEmit`嚗𣬚��𣈯�朞���

- [x] 34. �湔鰵 walkthrough.md 霈啣��祈蔭�嗅偏蝏𤘪�
  - 憸��蝏𤘪�嚗𡁜銁 `walkthrough.md` 霈啣� 7 銝芷△�Ｙ� authoritative 銝餃�頧賣䔉皞僐��𦻖�交䲮撘譌��鸌畾𡃏器�䕘�憒� `pda-shell` �芣� `loadConfig()` 閫�蛹銝餃�頧踝�隞亙�撉諹�蝏𤘪�嚗䔶噶鈭𤾸�蝏剖恣霈∩��𧼮���
  - �扯�蝏𤘪�嚗𡁜歇銵亙��祈蔭�嗅偏霈啣�嚗���� 7 銝芷△�Ｙ�銝餃�頧賣䔉皞僐��𦻖�交䲮撘譌��器�諹秩�𦒘�撉諹�蝏𤘪���

- [x] 35. 摰⊥鸌�����
  - 憸��蝏𤘪�嚗𡁜銁雿䭾�蝖格鸌��𧋦霈∪��㵪�銝滚�憪衤耨�嫣�餈� 7 銝芯��⊿△�Ｖ誨����交�銵䔶葉�𤑳緵�鞾△�Ｙ� authoritative source �斗鱏銝𡒊緵�厩��嫣�銝��湛�����啗��㘾𧫴畾菜凒�� `implementation_plan.md` �滨誧蝏准��
  - �扯�蝏𤘪�嚗𡁜歇����鞱��雴�摰⊥鸌嚗��撘�憪衤誨��耨�對��祈蔭�扯�銝剜𧊋�𤑳緵��閬����閫���� authoritative source 霂臬ế��

## 憿菟𢒰蝥� 403 �嗅偏蝚砌�頧殷�2026-04-05嚗��蝖株恕嚗�

- [x] 36. �箏�蝚砌�頧桅△�Ｙ漣 403 �嗅偏��凒銝𦒘���漣
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧桀蘨憭��摰∟恣銝剖歇蝖株恕�� 4 銝芰�摰鮋△�Ｖ蜓�亙藁瞍讐�憿蛛�銝齿�撅訫�撅��函�隞嗚��𢆡雿𦦵漣 403 �硋�摰�芋�埈醌撠整��
  - �格�憿箏�嚗䫤src/features/approval/tabs/approval-configs.tsx`��src/features/ai-assistant/tabs/ai-access-control.tsx`��src/features/approval/tabs/approval-requests.tsx`��src/features/approval/tabs/approval-history.tsx`��
  - �扯�蝏𤘪�嚗𡁜歇�㕑砲��凒摰峕�蝚砌�頧格𤣰撠橘��芣�撅訫��嗅�璅∪��硋𢆡雿𦦵漣 403 瘝餌���

- [x] 37. �嗆� approval-configs.tsx ��蜓�㰘蝸 403 憿菟𢒰��
  - 憸��蝏𤘪�嚗帋蛹 `ApprovalService.getConfigs()` + `ApprovalService.getUsers()` ���撅誩僎銵䔶蜓�㰘蝸撱箇�蝏煺�憿菟𢒰蝥折�霂舀𤣰���銝餃�頧質��� `403` �嗆㟲憿菜遬蝷� `ForbiddenState`嚗䔶�摮�/�𣳇膄/toast 靽脲��罸�餉���
  - �扯�蝏𤘪�嚗𡁜歇銝箏僎銵䔶蜓�㰘蝸�亙�憿菟𢒰蝥� `error` �嗅藁嚗䈣403` �嗆㟲憿菜遬蝷� `ForbiddenState`嚗屸�蝵桐�摮㗛曎頝臭�����塩��

- [x] 38. �嗆� ai-access-control.tsx ��蜓�㰘蝸 403 憿菟𢒰��
  - 憸��蝏𤘪�嚗帋蛹 `aiPolicyService.getPolicy()` 撱箇�憿菟𢒰蝥折�霂舐𠶖���銝餃�頧質��� `403` �嗆㟲憿菜遬蝷� `ForbiddenState`嚗𣬚��乩�摮䀝�撅��� toast 靽脲��罸�餉���
  - �扯�蝏𤘪�嚗𡁜歇�踵揢�� `logger-only` 銝餃�頧賢仃韐亙����銝餃�頧� `403` �嗆㟲憿菜遬蝷� `ForbiddenState`嚗䔶�摮䀝��𣂼��鞟內�曇楝靽脲��罸�餉���

- [x] 39. �嗆� approval-requests.tsx 銝� approval-history.tsx ��蜓�㰘蝸 403 憿菟𢒰��
  - 憸��蝏𤘪�嚗帋蛹銝支葵憿菟𢒰�� `ApprovalService.getMyApprovals()` 擐硋�銝餃�頧賢遣蝡钅△�Ｙ漣�躰秤�嗅藁嚗𢱌403` �嗆㟲憿菜遬蝷� `ForbiddenState`嚗�恣�孵𢆡雿栶����剹���蝝Ｖ� toast 靽脲��罸�餉���
  - �扯�蝏𤘪�嚗𡁜歇銝箔舅憿菔‘朣鞾△�Ｙ漣 `error` �嗅藁銝� `ForbiddenState`嚗𥕦恣�寥�朞�/�垍���IN���蝝Ｚ�皛支���蟮撅閧內�餉�靽脲�銝滚���

- [x] 40. 摰峕��� forbidden 頝舐眏憯喳蘨霂餃恣霈�
  - 憸��蝏𤘪�嚗𡁏瓲�� `src/features/errors/forbidden.tsx`��src/routes/(errors)/403.tsx`��src/routes/_authenticated/errors/$error.tsx` �臬炏隞齿糓憿菟𢒰銝餃�頧賡曎頝舐��笔�靘肽�嚗諹��臬歇���碶蛹�澆捆撅�/憭�鍂憯喉��祇★�芾粉嚗䔶��湔𦻖�𣳇膄��辣��
  - �扯�蝏𤘪�嚗𡁜歇摰峕��芾粉摰∟恣嚗𥕦��齿𧊋�𤑳緵憿菟𢒰銝餃�頧賡曎頝臭�銝餃𢆡頝唾蓮 `/403`嚗䔶�餈唳�隞嗥緵�嗆挾�湔𦻖餈煾�霂航楝�曹�蝟餃�摰孵�/憭�鍂憯喉�銝滚遣霈格𧋦頧桃凒�亙��扎��

- [x] 41. �扯�摰𡁜�撉諹�銝𡒊�霈箄扇敶�
  - 憸��蝏𤘪�嚗朞秐撠穃��鞟洵鈭諹蔭�孵𢆡��辣����� `eslint` 銝𦒘�甈� `pnpm exec tsc --noEmit`嚗�僎�� `walkthrough.md` 霈啣� 4 銝芷△�Ｙ�銝餃�頧賣䔉皞僐��𦻖�交䲮撘譌��唂 forbidden 頝舐眏憯喳恣霈∠�霈箔�靽萘�撱箄悅��
  - �扯�蝏𤘪�嚗𡁜歇�扯�蝚砌�頧桃𤌍���隞嗅��� `eslint` 銝� `pnpm exec tsc --noEmit`嚗𣬚��𣈯�朞�嚗𥕦僎�峕郊銵亙���﹝霈啣���

- [x] 42. 摰⊥鸌�����
  - 憸��蝏𤘪�嚗𡁜銁雿䭾�蝖格鸌��𧋦頧株恣�鍦�嚗䔶�撘�憪衤耨�嫣�餈� 4 銝芯��⊿△�Ｖ誨����� forbidden 頝舐眏憯喃��𡁜蘨霂餃恣霈∴�銝滚銁�祈蔭�芰＆霈文��湔𦻖�䭾㺿��
  - �扯�蝏𤘪�嚗𡁜歇����鞱��雴�摰⊥鸌嚗��撘�憪衤��∩誨��耨�對��� forbidden 頝舐眏憯喃���蘨霂餃恣霈∟器�䕘��芸銁�祈蔭�湔𦻖�䭾㺿��

## �� forbidden 頝舐眏憯喳��歹�2026-04-05嚗��蝖株恕嚗�

- [x] 43. �箏��� forbidden 頝舐眏憯喳��方���
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧桀蘨憭��撌脣恣霈∩蛹�鮋△�Ｖ蜓�㰘蝸銝駁曎頝舐��� forbidden 頝舐眏憯喉�銝齿�撅訫��嗅��躰秤憿菜�憿菟𢒰蝥� ForbiddenState 銝駁曎頝胯��
  - �格���凒嚗䫤src/features/errors/forbidden.tsx`��src/routes/(errors)/403.tsx`��src/routes/_authenticated/errors/$error.tsx` 銝剔� `forbidden` �惩���
  - �扯�蝏𤘪�嚗𡁜歇�㕑砲��凒�扯��𣳇膄銝擧�撠�𤣰�𨥈��芣�撅訫��嗅��躰秤憿菜�憿菟𢒰蝥� ForbiddenState 銝駁曎頝胯��

- [x] 44. �𣳇膄�� forbidden ���憯喃��祉� 403 頝舐眏�亙藁
  - 憸��蝏𤘪�嚗𡁶宏�� `ForbiddenError` ���憯喃��祉� `/403` �躰秤頝舐眏嚗偦��滢��嗘�敶枏�憿菟𢒰蝥� `ForbiddenState` 銝駁曎頝舫�憭滨��批�����
  - �扯�蝏𤘪�嚗𡁜歇�𣳇膄 `src/features/errors/forbidden.tsx` 銝� `src/routes/(errors)/403.tsx`��

- [x] 45. �嗆��躰秤頝舐眏�惩�銝剔� forbidden ��𣈲
  - 憸��蝏𤘪�嚗𡁜銁 `_authenticated/errors/$error.tsx` 銝剔宏�文笆 `ForbiddenError` ���撠��撟嗥＆靽嘥�雿䠷�霂舫△�惩�銝滚�敶勗���
  - �扯�蝏𤘪�嚗𡁜歇隞� `src/routes/_authenticated/errors/$error.tsx` 蝘駁膄 `ForbiddenError` 撘閧鍂銝� `forbidden` �惩�嚗䔶��坔�摰��霂舫△�惩�銝滚���

- [x] 46. �扯�靘肽�銝𤾸�敶㘾�霂�
  - 憸��蝏𤘪�嚗𡁶＆霈支�摨枏�銝滚��典笆 `ForbiddenError`��/(errors)/403` �� `/403` ���雿坔��剁�摰峕�摰𡁜� `eslint` 銝𦒘�甈� `pnpm exec tsc --noEmit`��
  - �扯�蝏𤘪�嚗𡁜歇摰峕�畾衤�撘閧鍂�𦦵揣嚗𥕦僎�扯��格���辣摰𡁜� `eslint` 銝� `pnpm exec tsc --noEmit`嚗𣬚��𣈯�朞���

- [x] 47. �湔鰵 walkthrough.md 霈啣��𣳇膄蝏栞捏
  - 憸��蝏𤘪�嚗𡁜銁 `walkthrough.md` 霈啣��祈蔭�𣳇膄���隞�/�惩�����支��柴���雿嗘�韏𡝗��亦��靝�撉諹�蝏𤘪���
  - �扯�蝏𤘪�嚗𡁜歇銵亙��𣳇膄靘脲旿����斗�隞�/�惩����雿嗘�韏𡝗瓲�亦��靝�撉諹�蝏𤘪���

- [x] 48. 摰⊥鸌�����
  - 憸��蝏𤘪�嚗𡁜銁雿䭾�蝖格鸌��𧋦頧桀��方恣�鍦�嚗䔶�撘�憪见��支�餈唳�隞嗆�靽格㺿�躰秤頝舐眏�惩�嚗𥕦��扯��嗅��唬�摮睃銁�笔�靘肽�嚗���𧼮�閫���嗆挾�湔鰵�寞��滨誧蝏准��
  - �扯�蝏𤘪�嚗𡁜歇����鞱��雴�摰⊥鸌嚗���扯��𣳇膄嚗𥟇𧋦頧格𧊋�𤑳緵��閬����閫�����摰硺�韏硔��

## �𣳇膄頝舐眏�滨蔭����峕郊�餃�嚗�2026-04-05嚗��蝖株恕嚗�

- [x] 49. �箏��𣳇膄��凒
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧桀蘨�𣳇膄 `src/features/authz/guards/route-before-load.ts` 銝凌�𨀣��砍𧑐 permissions �� await /profile �峕郊�齿𦆮銵諹楝�晦�萘��滨蔭�餃�嚗䔶��拙��圈△�Ｙ漣 ForbiddenState��𢆡雿𦦵漣�鞟內�硋�蝡舀𦻖����
  - �扯�蝏𤘪�嚗𡁜歇�㕑砲��凒�扯�嚗䔶�靽格㺿 `route-before-load.ts`嚗峕𧊋�拙��圈△�Ｙ漣 ForbiddenState��𢆡雿𦦵漣�鞟內�硋�蝡舀𦻖����

- [x] 50. �嗆� route-before-load 銝箔��⊿��餃���
  - 憸��蝏𤘪�嚗帋��� `waitForAuthHydration()` 銝� `accessToken` �⊿�嚗𥟇𧊋�餃�蝏抒賒頝唾蓮 `/sign-in`嚗䔶�銝滚��䭾𧋦�唳� permissions �屸獈憛噼楝�晞��
  - �扯�蝏𤘪�嚗𡁜歇�𣳇膄�砍𧑐�� permissions �嗥� `/profile` �滨蔭蝑匧�嚗𥕦��滢�靽萘� hydration 銝擧𧊋�餃�頝唾蓮 `/sign-in`��

- [x] 51. 靽萘��𤾸蝱����峕郊銝粹��餃�憓𧼮撩
  - 憸��蝏𤘪�嚗䫤AuthenticatedLayout` 銝剔緵�匧��啣�甇� `syncEffectivePermissionsFromProfile()` �舐誧蝏凋�銝箏�撘箏�甇伐�雿��敺堒�雿靝蛹頝舐眏����滨蔭�∩辣��
  - �扯�蝏𤘪�嚗𡁜歇靽萘� `AuthenticatedLayout` 銝剔��𤾸蝱撘�郊�峕郊嚗𥡝楝�� beforeLoad 銝滚�蝑匧� `/profile`��

- [x] 52. �扯�摰𡁜�撉諹�
  - 憸��蝏𤘪�嚗𡁜��� `route-before-load.ts` �詨�摰𡁜� `eslint` 銝𦒘�甈� `pnpm exec tsc --noEmit`嚗𣬚＆霈方楝�勗��怠��文�蝵格��鞾獈憛𧼮�蝐餃�銝𡡞�����仿�朞���
  - �扯�蝏𤘪�嚗𡁜歇�扯��詨�摰�㪗銝� `_authenticated/*/route.tsx` ����� `eslint`嚗峕� error嚗𢱌pnpm exec tsc --noEmit` �朞���

- [x] 53. �湔鰵 walkthrough.md 霈啣�颲寧�靚�㟲
  - 憸��蝏𤘪�嚗朞扇敶閙𧋦頧桀��斤��餃��餉�����支��柴����嗵��餃���嵗撉䔶��𤾸蝱撘�郊�峕郊颲寧���
  - �扯�蝏𤘪�嚗𡁜歇銵亙��𣳇膄靘脲旿��蔣�滩��氬����躰器�䔶�撉諹�蝏𤘪���

- [x] 54. 摰⊥鸌�����
  - 憸��蝏𤘪�嚗𡁜銁雿䭾�蝖格鸌���嚗䔶�靽格㺿 `route-before-load.ts` 銝𡁜𦛚�餉�嚗𥡝𥅾�扯�銝剖��啗��匧�摰� beforeLoad 銋笔銁隞亙�蝡舀��鞉㺭�桅獈憛噼楝�梧�����啗��㘾𧫴畾菔‘����滨誧蝏准��
  - �扯�蝏𤘪�嚗𡁜歇����鞱��雴�摰⊥鸌嚗���扯��𣳇膄嚗𥟇𧋦頧格𧊋�𤑳緵�嗅� `beforeLoad` 隞滚銁蝑匧� `/profile` �齿𦆮銵諹楝�晞��

## �曉�����峕郊�嗆��㺿�𩤃�2026-04-05嚗��蝖株恕嚗�

- [x] 55. �箏��寥�㰘���
  - 憸��蝏𤘪�嚗𡁏𧋦頧桀蘨靽桀��靝誑 `permissions.length === 0` �文��芸�甇乒�萘��嗆��㦤�桅�嚗��閬�𧒄��撠讛��� `usePermissionAccess()`嚗𥕢��拙��啗楝�梯蔓�行⏛��ctionGuard �券�瘝餌��㚚△�Ｙ漣 ForbiddenState 銝駁曎頝胯��
  - �扯�蝏𤘪�嚗𡁜歇�㕑砲��凒�扯�嚗䔶�靽格㺿 `auth-store.ts`��effective-permission-service.ts`��user-auth-form.tsx`��authenticated-layout.tsx`��use-permission-access.ts`嚗峕𧊋�拙��啗楝�梯蔓�行⏛��ctionGuard �㚚△�Ｙ漣 ForbiddenState 銝駁曎頝胯��

- [x] 56. 銝� AuthStore 撱箇��曉��峕郊�嗆��
  - 憸��蝏𤘪�嚗𡁜銁 `src/stores/auth-store.ts` 銝剖��交遬撘讐����/頨思遢�峕郊摰峕���扇嚗𣬚鍂鈭𤾸躹���𨅯��芸�甇乒�嘥��𨅯歇�峕郊雿���鞾�銝箇征�腈��
  - �扯�蝏𤘪�嚗𡁜歇�� `auth-store.ts` 銝剜鰵憓� `isIdentitySynced` 銝� `setIsIdentitySynced`嚗�僎�� reset / hydrate sanitize �嗆迤蝖桅�蝵柴��

- [x] 57. �嗆� AuthenticatedLayout �� shouldSyncIdentity �文�
  - 憸��蝏𤘪�嚗䫤src/components/layout/authenticated-layout.tsx` 銝滚�靘肽� `permissions.length === 0` �斗鱏�臬炏��閬���啣�甇伐��峕糓�寧鍂�曉��峕郊�嗆����
  - �扯�蝏𤘪�嚗䫤AuthenticatedLayout` 撌脫㺿銝箔蝙�� `!!accessToken && !isIdentitySynced` �文��臬炏��閬���啣�甇伐�銝滚��𢠃妟����冽�敶㮖��芸�甇乓��

- [x] 58. 霂�摯撟嗆�撠譍耨甇� usePermissionAccess 銵䔶蛹
  - 憸��蝏𤘪�嚗𡁻��齿��𨅯�甇乩葉/�嗆��鞟鍂�猾�嗪�霂舐�隞瑟��𨀣𧊋����嘅��仿�靚�㟲嚗䔶��帋��曉��峕郊�嗆����渡���撠譍耨憭溻��
  - �扯�蝏𤘪�嚗𡁜歇蝘駁膄 `usePermissionAccess()` 銝凌�𨅯�甇乩葉�湔𦻖�斗�����萘��餉�嚗𤤿緵�其��冽瓷�� `user` 敹怎��嗉��� `false`嚗䈣isChecking` 蝏抒賒�閧𡠺�湧蠧蝏� UI��

- [x] 59. �扯�摰𡁜�撉諹�
  - 憸��蝏𤘪�嚗𡁜��� `auth-store.ts`��authenticated-layout.tsx`��use-permission-access.ts` ����� `eslint` 銝𦒘�甈� `pnpm exec tsc --noEmit`��
  - �扯�蝏𤘪�嚗𡁜歇�扯� `auth-store.ts`��effective-permission-service.ts`��user-auth-form.tsx`��authenticated-layout.tsx`��use-permission-access.ts` ����� `eslint` 銝� `pnpm exec tsc --noEmit`嚗𣬚��𣈯�朞���

- [x] 60. �湔鰵 walkthrough.md 霈啣��嗆��㦤颲寧�靚�㟲
  - 憸��蝏𤘪�嚗朞扇敶閙𧋦頧格鰵憓䂿��曉��峕郊�嗆����妟����冽�霂凋�靽桀�����嗵��𤾸蝱撘�郊�峕郊颲寧�銝𡡞�霂���栶��
  - �扯�蝏𤘪�嚗𡁜歇銵亙��嗆��㦤靽桀�靘脲旿��耨�寧�����躰器�䔶�撉諹�蝏𤘪���

- [x] 61. 摰⊥鸌�����
  - 憸��蝏𤘪�嚗𡁜銁雿䭾�蝖格鸌���嚗䔶�靽格㺿 `auth-store.ts`��authenticated-layout.tsx`��use-permission-access.ts`嚗𥡝𥅾�扯�銝剖��圈�閬��撅訫��其�蝥扳��鞉祥�������啗��㘾𧫴畾菔‘����滨誧蝏准��
  - �扯�蝏𤘪�嚗𡁜歇����鞱��垍＆霈歹��齿�銵𣬚𠶖��㦤靽桀�嚗𥟇𧋦頧格𧊋�拙��啣𢆡雿𦦵漣���瘝餌���

## �𣳇膄璅∪�蝥扳𧋦�� TAB/���鋆��畾讠�嚗�2026-04-05嚗��蝖株恕嚗�

- [x] 62. �箏��𣳇膄��凒
  - 憸��蝏𤘪�嚗𡁏𧋦頧桀蘨�𣳇膄璅∪�撣��撅��𨀣𧋦�啁� TAB �航��批��湔𦻖摰�ế�䭾��萘�畾讠��餉�嚗屸��寡��� `src/components/layout/module-tabbed-layout.tsx` 銝𤾸��湔𦻖靘肽�嚗𥕢��拙��啗楝�梯蔓�行⏛��恣����滨垢�寞���ctionGuard �券�瘝餌��㚚△�Ｙ漣 ForbiddenState 銝駁曎頝胯��
  - �扯�蝏𤘪�嚗𡁜歇�㕑砲��凒�扯�嚗䔶�靽格㺿 `module-tabbed-layout.tsx`嚗峕𧊋�拙��啗楝�梯蔓�行⏛��恣����滨垢�寞���ctionGuard �㚚△�Ｙ漣 ForbiddenState 銝駁曎頝胯��

- [x] 63. 蝘駁膄璅∪�蝥扳𧋦�� TAB 蝏��鋆��
  - 憸��蝏𤘪�嚗䫤ModuleTabbedLayout` 銝滚��牐蛹�滨垢�砍𧑐 `accessibleTabs` 銝箇征撠望葡�𣏾�𨅯��齿芋�埈��惩虾霈輸䔮憿萇倌�脲��𨅯��漤△蝑暹���䰻�𦥑�苷�銝箸�蝏��霈綽�璅∪���捆摨𠉛誧蝏凋漱�梢△�Ｚ䌊頨思��𡒊垢蝏𤘪��喳���
  - �扯�蝏𤘪�嚗䫤ModuleTabbedLayout` 撌脣��手�𨅯��齿芋�埈��惩虾霈輸䔮憿萇倌 / 敶枏�憿萇倌�䭾��亦��萘��砍𧑐蝏��鋆��嚗���滢�韐蠘提撣��憯喋��△蝑曉�閫����捆摰孵膥��

- [x] 64. �嗆� route-access �冽芋��/TAB ���銝羓��諹提
  - 憸��蝏𤘪�嚗䫤src/features/authz/guards/route-access.ts` 銝剔� `getAccessibleTabs()` / `canAccessPath()` 銝滚��踵�璅∪�蝥扳�蝏���亥��喉�隞�銁蝖格�敹���� UI 颲�𨭌�箸艶靽萘���撠讛�韐��銝滚�蝏抒賒雿靝蛹璅∪�銝餃�摰寞𦆮銵�/�垍���ế摰帋��柴��
  - �扯�蝏𤘪�嚗𡁏𧋦頧桀歇��鱏 `route-access.ts` �� `ModuleTabbedLayout` 銝剔�璅∪�蝥抒�撅�鋆���券�䈑�`route-access.ts` ��辣�祈澈�芯�憸嘥��拚𢒰靽格㺿嚗䔶誑�踹��惩��𥪜𢆡��

- [x] 65. 靽萘��餃����憿菟𢒰蝥批�蝡航��喲曎頝�
  - 憸��蝏𤘪�嚗𡁶誧蝏凋��嗵蒈敶閙��嵗撉䕘�璅∪�憿菟𢒰�臬炏�航��勗�蝡舀𦻖����䂿��靝�憿菟𢒰�芾澈�躰秤��㗁�伐�銝齿鰵憓硺遙雿訫�蝡舐恣����寞��𡝗��𣂼�摨𨰻��
  - �扯�蝏𤘪�嚗𡁜歇靽萘��Ｘ��餃���曎頝臭�憿菟𢒰蝥折�霂舀㗁�伐��祈蔭�芣鰵憓硺遙雿訫�蝡舐恣����寞��𡝗��𣂼�摨𨰻��

- [x] 66. �扯�摰𡁜�撉諹�
  - 憸��蝏𤘪�嚗𡁜��� `module-tabbed-layout.tsx`��route-access.ts` �𠰴�敶勗�璅∪��亙藁����� `eslint` 銝𦒘�甈� `pnpm exec tsc --noEmit`��
  - �扯�蝏𤘪�嚗𡁜歇�扯� `module-tabbed-layout.tsx`��system-mgmt/index.tsx`��system-management/route.tsx` ����� `eslint` 銝� `pnpm exec tsc --noEmit`嚗𣬚��𣈯�朞���

- [x] 67. �湔鰵 walkthrough.md 霈啣�颲寧�靚�㟲
  - 憸��蝏𤘪�嚗朞扇敶閙𧋦頧桀��斤�璅∪�蝥扳𧋦�� TAB 鋆������支��柴����嗵��餃����憿菟𢒰蝥批�蝡航��唾器�䎚���霂���栶��
  - �扯�蝏𤘪�嚗𡁜歇銵亙��祈蔭�𣳇膄靘脲旿��耨�寧�����躰器�䔶�撉諹�蝏𤘪���

- [x] 68. 摰⊥鸌�����
  - 憸��蝏𤘪�嚗𡁜銁雿䭾�蝖格鸌���嚗䔶�靽格㺿 `module-tabbed-layout.tsx`��route-access.ts` �𣇉㮾�單芋�堒�����交�銵䔶葉�𤑳緵餈䀹��嗅�撣��撅�銁隞亙�蝡舀𧋦�唳��𣂼恐�斗�蝏���頣�����啗��㘾𧫴畾菔‘����滨誧蝏准��
  - �扯�蝏𤘪�嚗𡁜歇����鞱��雴�摰⊥鸌嚗���扯��𣳇膄嚗𥟇𧋦頧格𧊋�𤑳緵��閬���單�撅訫�����嗅�撣��撅��撅�鋆���嫘��

## 皜���滨垢�砍𧑐�斗�畾讠�嚗�2026-04-05嚗��蝖株恕嚗�

- [x] 69. �箏�皜����凒
  - 憸��蝏𤘪�嚗𡁏𧋦頧格����蝡舀𧋦�唳��鞱��單��辷��滨�閬�� `usePermissionAccess.ts`��check-permission.tsx`��app-sidebar.tsx`��navigation-access.ts`��route-entry-access.ts` �𠰴��湔𦻖靚�鍂�對�銝齿�撅訫�頝舐眏頧舀㜃�芥���蝡舐恣����寞�/�𨅯��㚚△�Ｙ漣 ForbiddenState 銝駁曎頝胯��
  - �扯�蝏𤘪�嚗𡁜歇�㕑砲��凒�扯�嚗峕瓲敹�耨�寥�銝剖銁 `usePermissionAccess.ts`��check-permission.tsx`��navigation-access.ts`��route-entry-access.ts`嚗𢱌app-sidebar.tsx` �牐�韏𤥁◤��鱏�峕���憸嘥��孵𢆡��

- [x] 70. �𣳇膄�其�蝥批�蝵桃�頝�
  - 憸��蝏𤘪�嚗𡁶宏�� `guardPermission()` / `hasPermission()` �典𢆡雿𨀣�鈭斗�蝔衤葉���𨅯�蝡臬� return �餅迫霂瑟��穃枂�脲芋撘𧶏��其��臬炏��捂�扯�蝏煺�鈭斤眏�𡒊垢餈𥪜�蝏𤘪��喳���
  - �扯�蝏𤘪�嚗䫤guardPermission()` / `hasPermission()` 撌脖��滚抅鈭𤾸�蝡舀𧋦�唳��𣂼翰�折獈甇Ｗ𢆡雿𡏭窈瘙���滨垢銝滚��典𢆡雿𨅯�蝵桅𧫴畾萄�蝏��鋆����

- [x] 71. �𣳇膄蝏�辣蝥扳𧋦�唳遬�鞱���
  - 憸��蝏𤘪�嚗𡁶宏�� `CheckPermission` 餈嗵掩�箔��滨垢�砍𧑐���敹怎��湔𦻖�鞱��厰僼/�滢���捆���撅�鋆��嚗𥕦���靽萘� UI �牐�嚗䔶��賭�銝粹�蝏��撅閧內嚗䔶�敺烾獈甇Ｗ�蝡航��喲曎頝胯��
  - �扯�蝏𤘪�嚗䫤CheckPermission` 撌脫㺿銝箇凒�仿�譍� `children`嚗䔶��滢誑�砍𧑐���敹怎��鞱���捆��

- [x] 72. �𣳇膄撖潸⏛銝𤾸���𧋦�啣ế��
  - 憸��蝏𤘪�嚗䫤app-sidebar.tsx`��navigation-access.ts`��route-entry-access.ts` 銝滚��箔��滨垢�砍𧑐���敹怎�鋆���𨅯��������楊璅∪�頝唾蓮�臬炏�曄內嚗𥕦�蝡臭��滨��芸�摰尠�𨅯𪑛�諹�餈�/�芷�銝滩�餈𥕞�腈��
  - �扯�蝏𤘪�嚗䫤navigation-access.ts` 銝� `route-entry-access.ts` 撌脣��斗𧋦�啗�皛日�餉�嚗𢱌app-sidebar.tsx` �唬��滨��望��鞱�皛方��𧼮��鞱��閖�����

- [x] 73. 靽萘��餃����憿菟𢒰蝥批�蝡航��喲曎頝�
  - 憸��蝏𤘪�嚗𡁶誧蝏凋��嗵蒈敶閙��嵗撉䕘�憿菟𢒰/�其���蝏�糓�血�霈貉挪�格��扯�嚗𣬚眏�𡒊垢�亙藁餈𥪜�蝏𤘪�銝𡡞△�Ｚ䌊頨恍�霂舀��㗁�伐��滨垢敹�◆蝑匧��𡒊垢餈𥪜�嚗峕�霈箄��𧼮�銋���
  - �扯�蝏𤘪�嚗𡁏𧋦頧格𧊋靽格㺿�餃���嵗撉䔶�憿菟𢒰蝥� `ForbiddenState` 銝駁曎頝荔��滨垢�砍𧑐�斗��詨��亙藁撌脰◤蝘駁膄嚗��雿嗵��𦦵�銝�蝑匧��𡒊垢餈𥪜��踵𦻖��

- [x] 74. �扯�摰𡁜�撉諹�
  - 憸��蝏𤘪�嚗𡁜��鞉𧋦頧桀�敶勗�����曇楝��辣����� `eslint` 銝𦒘�甈� `pnpm exec tsc --noEmit`��
  - �扯�蝏𤘪�嚗𡁜歇�扯� `use-permission-access.ts`��check-permission.tsx`��navigation-access.ts`��route-entry-access.ts`��app-sidebar.tsx` ����� `eslint` 銝� `pnpm exec tsc --noEmit`嚗𣬚��𣈯�朞���

- [x] 75. �湔鰵 walkthrough.md 霈啣�颲寧�靚�㟲
  - 憸��蝏𤘪�嚗朞扇敶閙𧋦頧桀��斤��滨垢�砍𧑐�斗��曇楝����支��柴����嗵��餃�����𡒊垢鋆��颲寧����霂���栶��
  - �扯�蝏𤘪�嚗𡁜歇銵亙��祈蔭�𣳇膄靘脲旿��瓲敹�㺿�函�����躰器�䔶�撉諹�蝏𤘪���

- [x] 76. 摰⊥鸌�����
  - 憸��蝏𤘪�嚗𡁜銁雿䭾�蝖格鸌���嚗䔶�靽格㺿銝𡃏膩�滨垢�砍𧑐�斗��曇楝��辣嚗𥡝𥅾�扯�銝剖��啗��匧�摰��隞嗡誑�砍𧑐���敹怎�鋆����蝏�虾閫��扳��其��扯�嚗���𧼮�閫���嗆挾銵亙��𤾸�蝏抒賒��
  - �扯�蝏𤘪�嚗𡁜歇����鞱��雴�摰⊥鸌嚗���扯�皜��嚗𥟇𧋦頧格��Ｗ���凒摰峕��詨��曇楝��鱏��

## 瘝餌� experimental / logistics-api-sandbox 璅∪�嚗�2026-04-05嚗��蝖株恕嚗�

- [ ] 77. �箏�瘝餌���凒
  - 憸��蝏𤘪�嚗𡁏𧋦頧桀蘨瘝餌� `src/features/experimental` 銝� `src/features/logistics-api-sandbox` 餈嗘舅銝芰𤌍敶訫��嗥凒�亥楝�勗����銝齿�撅訫��惩�銝𡁜𦛚璅∪���楝�梯蔓�行⏛�㚚△�Ｙ漣 ForbiddenState 銝駁曎頝胯��

- [ ] 78. �𡒊＆敶枏�餈鞱��喟頂
  - 憸��蝏𤘪�嚗朞扇敶� `experimental` 敶枏��� `_authenticated/experimental/*` 頝舐眏�笔���蝸嚗䈣logistics-api-sandbox` 敶枏��� `/_authenticated/system-management/logistics-api` 頝舐眏�笔��輯蝸嚗䔶����銝齿糓�𨅯虾�湔𦻖�拍��𣳇膄���撘閧鍂�桀��腈��

- [ ] 79. �喳�瘝餌��孵�
  - 憸��蝏𤘪�嚗𡁜笆銝支葵�桀����蝏坔枂皜�苊蝏栞捏嚗�
    - `experimental`嚗𡁏糓蝏抒賒靽萘�銝箸迤撘𤩺芋�𨰜���甇��嚗諹��臬�銝讠瑪頝舐眏�𤾸��歹�
    - `logistics-api-sandbox`嚗𡁏糓餈�迤�滢蛹甇��蝟餌�蝞∠�摮鞉芋�梹�餈䀹糓��鱏蝟餌�蝞∠��亙藁�滚��扎��

- [ ] 80. 閫����撠𤩺㺿�㰘楝敺�
  - 憸��蝏𤘪�嚗朞𥅾�㗇𥋘�𣳇膄嚗���堒枂敹�◆��鱏撘���楝��/�亙藁/���頝舐眏�睲�韏吔��仿�㗇𥋘靽萘�嚗���粹�閬��甇����𤌍敶𨰻��楝�晞��abs���獢������拐�韏硔��

- [ ] 81. �扯�摰𡁜�撉諹�憸��
  - 憸��蝏𤘪�嚗𡁏��齿�蝖桀�蝏剜�銵峕𧒄��閬��霂��頝舐眏�亙藁��oute tree �����掩�𧢲��乩��堒蔣�滩���/璅∪��亙藁��

- [ ] 82. �湔鰵 walkthrough.md 霈啣�瘝餌��喟�
  - 憸��蝏𤘪�嚗朞扇敶蓥舅銝芰𤌍敶訫��滨�餈鞱��喟頂����臬�箸�扯捶���蝏�祥���蝑碶�撉諹���凒��

- [ ] 83. 摰⊥鸌�����
  - 憸��蝏𤘪�嚗𡁜銁雿䭾�蝖格鸌���嚗䔶��𣳇膄 `experimental` / `logistics-api-sandbox` �桀�嚗䔶�銝滢耨�孵�頝舐眏�亙藁嚗𥡝𥅾�扯�銝剖��啗��㗇凒憭𡁜�撉�/瘝嗵拳�桀�鋡怎�摰硺��∟楝�望㗁頧踝�����啗��㘾𧫴畾菔‘����滨誧蝏准��

## �典����臬�箸祥�����漣皜��嚗�2026-04-06嚗��蝖株恕嚗�

- [x] 84. �箏��祈蔭瘝餌�颲寧�銝𦒘���漣
  - 憸��蝏𤘪�嚗𡁏�蝖格𧋦頧格糓�𨅯�撅����臬�箸祥����坿蔭�嘅�隡睃�蝥批𤐄摰帋蛹嚗�1) 霈方�/���敹怎��曉����2) ����詨� API �滨妍銝𤾸����銝箏仃���3) ����曇�血��㵪�4) 摰鮋�/瘝嗵拳璅∪��踵�撣賊彿嚗𥕦��滢��湔鰵閫����﹝嚗䔶�撘�憪衤��∩誨��耨�嫘��
  - �扯�蝏𤘪�嚗帋�撌脫鸌����� P0 �扯��嗆挾嚗𥕦��滢��刻��𡏭恕霂�/���敹怎��曉����嘅��嗡� P1/P2 憿嫣�����扯�嚗䔶�撟嗉��拚𢒰��

- [x] 85. �条�霈方�/���敹怎��券曎頝�
  - 憸��蝏𤘪�嚗𡁏４���𡏭��煺漣���敹怎����蝻枏����鈭峕活�惩極���瘨�晶銝箄���/憿菟𢒰/�厰僼�航��扼���韐蠘提�瑟鰵�萘�摰峕㟲�曇楝嚗�僎�堒枂敶枏�憭𡁏�敹怎����撘� fallback���憭齿晷�煺�擃㗛��拇鱏�嫘��
  - �扯�蝏𤘪�嚗𡁜歇蝖株恕�𡒊垢 `/profile` + `server/dependencies/effective_access.go` �臬��齿�����𣂷蜓�交�嚗𥕦�蝡� `useAuthStore.user` �踵𦻖敹怎�嚗䈣syncEffectivePermissionsFromProfile()` �冽��笔��坔� `role + permissions` 撟嗉挽蝵� `isIdentitySynced = true`����嗅��唬舅銝芸��格鱏�對�1) �餃��𣂼��� `user-auth-form.tsx` �曉銁 `/profile` �峕郊�齿��滚��� `isIdentitySynced = true`嚗䔶��園�罱�𨅯歇�峕郊雿�征����萘���𠶖���2) �滨垢憭帋葵瘨�晶�寡蒾�亙� `hasAuthSessionPermission` ���嚗䔶� `usePermissionAccess()` 銝� `CheckPermission` 敶枏���蛹 no-op/�� true嚗䔶�摨磰◤霂臬ế銝箇�甇���喳���

- [x] 86. 摰帋��臭����敹怎�憟𤑳漲
  - 憸��蝏𤘪�嚗𡁜耦�𣂷�隞賣�蝖桃����敹怎�憟𤑳漲�㗇�嚗諹秐撠𤏸秩�舘��脫䔉皞僐����冽䔉皞僐��凒�交������蝏������僐��menu/page/tab/action` 雿𦦵鍂�笔��������/�園𡢿�喳�畾蛛�隞亙��滨垢��捂/蝳�迫蝏抒賒�典紡��器�䎚��
  - �扯�蝏𤘪�嚗𡁜��漤𧫴畾萄�敶Ｘ���撠誩�蝥衣�霈綽��滨垢�臭��臭縑敹怎�隞� `useAuthStore.user` 銝剔� `role + permissions` 銝箸㗁�仿𢒰嚗䔶��嗆㺭�桀�憿颱誑�𡒊垢 `/profile` �𡁜�蝏𤘪�銝箏�嚗𤤿蒈敶訫�摨𥪯���捂雿靝蛹銝湔𧒄餈�腹嚗䔶�敺埈��𦦵蒈敶閙��麨�萘凒�亦�隞瑟��𡏭澈隞賢歇�峕郊�腈��歇��氜�圈�銝芣覔�牐耨憭㵪�蝘駁膄�餃��𣂼��舘��抵挽蝵� `isIdentitySynced = true` ���霂臬��伐��嫣蛹�芣� `/profile` �峕郊�𣂼��擧���扇撌脣�甇伐�隞舘�屸��滨征�����翰�折鵭����踺��

- [x] 87. �嗆��滨垢���閫������寥�㰘���
  - 憸��蝏𤘪�嚗𡁏�蝖桀𪑛鈭𥟇��鞱��喳�憿餃��典�蝘餃��滚𦛚蝡荔��芯��滨垢�餉��芯��坔�蝷�/蝳�鍂/�鞟內�諹提嚗𥕦��嗅��粹�閬�𤣰����砍𧑐 merge���瘚见��惩����撘� fallback 銝𡡞�憭滨�摮条���
  - �扯�蝏𤘪�嚗𡁜歇摰峕�蝚砌��嗆挾�嗅藁嚗�1) `AuthenticatedLayout` �嫣蛹蝑匧��𡒊垢 `/profile` �峕郊摰峕��𤾸�皜脫��𦯀��文�摰對�2) �����/�����/��楝�勗��怠��𣂼𦶢�滢���辣�滨漣�餉秤撖潘��扯楝敺� `check-permission` / `use-permission-access` / `route-before-load` 撌脣��刻�蝘鳴�3) `resolveStoredPermissionIds` 撌脖��𨅯�摮䀝����脲𤣰�𥕢蛹�𡏭澈隞賣𧊋�峕郊�嗡���粥�𡒊垢鋆���嘅�4) `users-add-admin-dialog`��use-ai-permissions`��notification-center`��system-mgmt/tabs/index.tsx` 蝑厰�憌𡡞埯銝𡁜𦛚�亙藁撌脩宏�文抅鈭� `hasAuthSessionPermission` / `hasAuthSessionRole` ���蝡舀�頝航��喋��

- [ ] 88. 璇喟�����詨� API �賢�憭梁�皜��
  - 憸��蝏𤘪�嚗朞��� `save/get/list/toggle` 蝑匧�蝘唬�摰鮋�銵䔶蛹銝滢��渡� handler��ervice��ook��掩�衤��滨垢 API 撠��嚗�躹���𨅯�憪钅�蝵栽�吲�𡏭���翰�把�吲�𨀣�蝏���喇�吲�𦣇reate/update/patch/replace�肽祗銋㚁�撟嗆�瘜典遣霈格鰵�滨妍銝𤾸�摰寡�蝘駁�瘙���

- [ ] 89. �嗅���� API 霂凋��⊥迤銝𤾸�摰寡�蝘餉恣��
  - 憸��蝏𤘪�嚗𡁶��粹�霂臬紡�亙藁����賢�憿箏����摰孵�蝑𣇉裦����冽䲮�踵揢��凒����拍�銝𤾸�敶㘾�霂��瘙���踹�銝�甈⊥�扳㺿�滨聦�𤩺𠳿�厰曎頝胯��

- [ ] 90. �条�����曉�撅��瘛瑕��諹提���
  - 憸��蝏𤘪�嚗𡁏����/頝舐眏/�𨅯�/action/contract 蝑厩��鞾曎����𨀣�鈭见�撅���蓮�Ｗ����銵峕𧒄瘨�晶撅����霂���嘅�撟嗉��怠��嗆㗁����僐��allback����滢耨銵乓���銵峕𧒄�𨀣���毽���韐���嫘��

- [ ] 91. �嗅�����曇圾�虫��曉�皜���𡝗䲮獢�
  - 憸��蝏𤘪�嚗𡁏�蝖桀𪑛鈭𥡝��坔�隞舘�銵峕𧒄�𣂼��典紡�嫣蛹�曉�皜���𡝗�撠�”嚗�𪑛鈭𤤿��鞉郊撉文虾隞亙�撟�/�𣳇膄嚗𣬚𤌍��糓�𢠃曎頝舀𤣰�𥟇��𨀣�摰帋� -> ����� -> 瘨�晶�萘��臬恣霈∠�����

- [ ] 92. �条�摰鮋�/瘝嗵拳璅∪�韏�漣銝舘�銵��蝟�
  - 憸��蝏𤘪�嚗帋�隞���� `experimental` / `logistics-api-sandbox`嚗諹�閬�＆霈文��齿糓�血��典�隞硋�撉峕�����蝞望�����霂�△�碶葩�嗆芋�𡑒��交迤撘讛楝�晞����𨰻����鞉���遣�曇楝嚗�僎霈啣��券�𢛵���摰𧼮�������𦒘蝙�函𠶖���靘肽��喟頂��

- [ ] 93. �嗅�摰鮋�/瘝嗵拳璅∪���掩瘝餌��喟�
  - 憸��蝏𤘪�嚗𡁜�摰鮋�/瘝嗵拳韏�漣��掩銝算�𡏭蓮甇���仮�吲�𡏭�蝘餃��祉� labs/sandbox �算�吲�靝�銝餉楝�望��支�靽萘�皞鞟��吲�𦦵＆霈斗�靘肽��𤾸��手�嘅�撟嗉秩�擧�蝐餌��滨蔭�∩辣����拐�撉諹���凒��

- [ ] 94. 敶Ｘ���𧫴畾菜�銵屸◇摨譍��𣬚�蝣�
  - 憸��蝏𤘪�嚗朞��� `M1 ���銝駁曎�航圾�𢲩��M2 API 霂凋��航粉`��M3 ����曉虾摰∟恣`��M4 摰鮋�颲寧�皜�苊` ��𧫴畾萇𤌍����漱隞条�銝𡡞𧫴畾菟��嗆����靘蹂��𡒊賒�厰�蝔讠��刻��䔶��臬僎銵�仃�扼��

- [ ] 95. 摰⊥鸌�����

## �㛖�摰∟恣�餉��拍�皜��嚗�2026-04-06嚗峕楛摨行���蔭甈∴�

- [x] 1. �𡒊垢 Handler �餉��拍�皜��
  - [x] 敶餃��𣳇膄 `server/handlers/` 銝剜��㗇��冽釣�亦� `AuditLogStrict` / `writeBulkSyncAudit` 靚�鍂��
  - [x] �齿� `bulk_sync_audit.go`嚗䔶�靽萘��湔��餉���

- [x] 2. �𡒊垢璅∪�銝擧㺭�桀�皜��
  - [x] �拍��𣳇膄 `server/models/shared.go` 銝剔� `AuditLog` 蝏𤘪�雿枏�銋剹��
  - [x] 隞� `server/db/db.go` �� `AutoMigrate` �𡑒”銝剔宏�� `AuditLog`��

- [/] 3. �𡒊垢�滚𦛚撅� (Services) 瘛勗漲皜��
  - [ ] 蝘駁膄 `server/services/service_runtime.go` 銝剔� `auditLogger` �亙藁�� `defaultAuditLogger` 摰䂿緵��
  - [ ] �齿� `ProductionService`嚗𡁶宏�� `auditLogger` ���惩��啜���畾萄����� `.Write()` 靚�鍂��
  - [ ] �齿� `OrganizationService`嚗𡁶宏�� `auditLogger` 靘肽���
  - [ ] 皜�� `OrganizationService` 銝剔��𦦵滲摰∟恣�券�婙�萘�霈∩誨�� (憒��created/changed 霈⊥㺭��ummary ��遣)��
  - [ ] 敶餃�皜�膄 `server/services/audit_service.go` ���摰嫘��

- [ ] 4. �訫�瘚贝� (Tests) 皜��
  - [ ] �拍�皜�膄 `bulk_sync_contract_test.go`, `bulk_sync_users_test.go`, `delete_audit_test.go`��
  - [ ] 蝘駁膄 `production_service_test.go` 銝� `organization_service_test.go` 銝剔� `fakeAuditLogger`��

- [ ] 5. �滨垢蝣𡒊��砽�𨅯恣霈﹦�嗪�餉�皜��
  - [ ] 霂��撟嗅��斗��劐�靚�鍂 `/api/audit` �碶�韏� `models.AuditLog` ��△��/蝏�辣 (蝏𤩺䰻嚗䔶��∪��脩�隞嗅� `ShipmentHistory` 鈭�誑靽萘�)��
  - [ ] 蝖桐��滨垢�賡��𡝗�獢�葉銝滚���鉄撌脣�撘�恣霈∪��賜㮾�喟��讛膩��

- [ ] 6. ��蝏��蝟餌��𧼮�撉諹�
  - [ ] �典��𦦵揣 `AuditLog`, `AuditEntry`, `WriteAuditLog` 蝖株恕 0 �寥���
  - [ ] �扯� `go build ./...` 蝖株恕�删�霂煾�霂胯��
  - [ ] �扯� `pnpm exec tsc --noEmit` 蝖株恕�滨垢�惩��冽��踺��
  - 憸��蝏𤘪�嚗𡁜銁雿䭾�蝖格鸌���嚗䔶�靽格㺿���敹怎��整����� API����鞾曎�硋�撉�/瘝嗵拳璅∪�����∩誨����交��乩葉�𤑳緵瘥𥪜��滩��埝凒憭抒��游��扯��剁������ `implementation_plan.md` 銵亙��寞��𤾸�蝏抒賒��

## P0 服务层审计链收口与构建恢复（2026-04-06，待确认）

- [x] 20. 收口 `service_runtime.go` 的审计注入能力
  - [x] 盘点当前 `transactionManager` / `gormTransactionManager` 缺失的 `auditLogger` 注入边界。
  - [x] 明确默认运行时应如何提供 `defaultAuditLogger`，避免服务层继续各自绕过统一入口。
  - [x] 设计最小改造方案，确保不影响现有只读调用。

- [x] 21. 收口 `ProductionService` / `OrganizationService` 的审计写入主链
  - [x] 为关键写操作接入统一 `auditLogger`，替代散落或缺失的审计写入。
  - [x] 优先覆盖当前已暴露“测试名存在但断言未闭环”的删除 / 批量同步等高风险写操作。
  - [x] 保持日志语义英文、用户面说明中文，不额外扩散无关重构。

- [x] 22. 补服务层测试并核对 `/api/audit` 链路
  - [x] 为 `production_service_test.go` / `organization_service_test.go` 引入 `fakeAuditLogger` 或等价测试注入。
  - [x] 修复当前“测试标题为 writes audit，但实际未断言审计写入”的空壳测试。
  - [x] 核对 `/api/audit` 与 `models.AuditLog` / 相关 handler 的读链路是否承接服务层新写入格式。

- [x] 23. 推进构建恢复与结果总结
  - [x] 优先让与本链路相关的 `go test` / `go build` 恢复稳定。
  - [x] 已单独执行 `go build ./...`，当前工作区全量构建通过，无需再区分本轮残留与历史阻塞。
  - [x] 将结果同步到 `walkthrough.md`。

## P1 第三批接口语义升级（2026-04-06，已确认）

- [ ] 7. 拆分 `PATCH /users/:id` 与 `PUT /users/:id` 语义
  - [ ] 新增真正的 `ReplaceUserHandler`，让 `PUT /users/:id` 承接完整资源替换语义。
  - [ ] 保持 `PatchUserHandler` 仅处理按字段存在性更新。
  - [ ] 明确 replace 场景下的必填字段、可清空字段与禁止覆盖字段边界。

- [ ] 8. 为身份快照增加准确别名入口
  - [ ] 新增 `GET /auth/snapshot` 作为规范入口。
  - [ ] 暂时保留 `GET /profile` 作为兼容入口，避免一次性打断现有调用链。
  - [ ] 逐步将前端内部主调用迁移到 `/auth/snapshot`。

- [ ] 9. 统一 `fetchUsers` 长期返回契约
  - [ ] 将主查询接口收敛为分页结构：`items / total / page / pageSize`。
  - [ ] 为审批人选择、下拉选项等轻量场景拆出独立用户选项接口，避免继续复用主查询接口赌数组返回。
  - [ ] 清理当前“数组 / 分页结构”混用点，消除调用方理解不一致。

## P1 第三批接口语义升级测试补强（2026-04-06，待确认）

- [x] 10. 补 `ReplaceUserHandler` 后端回归测试
  - [x] 覆盖 `PUT /users/:id` 完整替换语义，断言 `username / phoneNumber / firstName / lastName / role / status / employeeId` 被整包覆盖。
  - [x] 覆盖“未提供 password 时不改密码”场景，避免 replace 误清空或误重置密码。
  - [x] 覆盖非法 `role / status` 校验与管理员保护边界，确保 replace 语义不突破既有安全约束。

- [x] 11. 补 `/auth/snapshot` 后端与前端回归测试
  - [x] 后端验证 `/auth/snapshot` 与 `/profile` 返回同一身份快照结构，确保别名不漂移。
  - [x] 前端验证身份快照同步函数主调用已切到 `/auth/snapshot`，并正确回填 `role / effectiveRoles / permissions`。
  - [x] 验证前端仍保持“以后端为准”的身份快照消费，不引入前端自判权限分支。

- [x] 12. 补用户分页契约后端与前端回归测试
  - [x] 后端验证 `GET /users` 返回 `items / total / page / pageSize`，并覆盖 `username / status / role` 过滤与 `options=true` 轻量分支。
  - [x] 前端验证 `fetchUsers()` 解析分页结果、`fetchUserOptions()` 解析轻量数组结果。
  - [x] 如测试基建允许，补充 `useUsersQuery / useUserOptionsQuery` 或消费层最小回归，避免再次出现数组/分页契约混用。

- [x] 13. 执行验证并同步总结
  - [x] 运行后端定向测试、前端测试与 `pnpm exec tsc --noEmit`。
  - [x] 将测试结果补充到 `walkthrough.md`。

## P1 前端回归测试接入与 hooks 补强（2026-04-06，待确认）

- [x] 14. 将前端 contract test 接入常用脚本与 CI
  - [x] 收敛 `package.json` 中的测试脚本层级，明确 contract tests 的常用入口。
  - [x] 将 `test:contracts` 接入现有 `.github/workflows/ci.yml`，确保 PR / main 分支持续校验。
  - [x] 避免把过重的前端测试直接塞进 `build`，优先走独立测试步骤，减少构建链路耦合。

- [x] 15. 补 `useUsersQuery / useUserOptionsQuery` hooks 层回归测试
  - [x] 验证 `useUsersQuery` 触发 `fetchUsers` 且 query key 保持分页查询语义。
  - [x] 验证 `useUserOptionsQuery` 触发 `fetchUserOptions` 且 query key 与主列表查询隔离。
  - [x] 覆盖 hooks 层最小职责边界，避免再次出现“分页列表 / 轻量选项”混用回退。

- [x] 16. 执行验证并同步总结
  - [x] 运行 Vitest 定向测试、`pnpm exec tsc --noEmit`，以及如有需要的 CI 配置校验。
  - [x] 将接入结果与 hooks 测试结果补充到 `walkthrough.md`。

## P1 生成链耦合治理（2026-04-06，待确认）

- [ ] 27. 盘点权限生成链的源事实层 / 转换层 / 运行时消费层
  - [ ] 识别当前源事实层：`server/authz/permissions.go`、自动生成的 `authenticated-route-catalog.ts`。
  - [ ] 识别当前转换层：`permission-catalog.ts`、`route-permissions-generator.ts`、`action-permission-catalog.ts`、`default-permissions.ts`。
  - [ ] 识别当前运行时消费层：`route-access.ts`、`use-roles.ts`、用户权限树构建与相关 UI 投影工具。

- [ ] 28. 标出生成链中的混合职责节点与隐式规则
  - [ ] 找出同时承担“生成 + fallback + 运行时匹配”的节点，避免继续把消费期猜测混进生成期。
  - [ ] 记录当前显式映射与高风险手工兜底：如 `ROUTE_TO_MENU_MAPPING`、页面/Tab parent 兜底、`routeBindings` 手工目录。
  - [ ] 记录当前缓存、排序、去重、路径规格化等逻辑分别属于哪一层，避免后续继续叠加第二真相。

- [ ] 29. 输出执行前规划并暂停等待确认
  - [ ] 给出后续最小执行顺序：先拆层、再收敛 fallback、最后补验证脚本/回归。
  - [ ] 明确本阶段只做规划与分层盘点，不直接大改业务代码。
  - [ ] 将结果同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

## P1 action routeBindings contract 化（2026-04-06，待确认）

- [ ] 41. 将 `action-permission-catalog.ts` 的 `routeBindings` 从字符串目录收敛为结构化 contract
  - [ ] 设计最小结构，例如 `{ method, path }`，避免继续依赖自由格式字符串。
  - [ ] 保留必要兼容层，避免一次性打断现有脚本或消费点。
  - [ ] 明确注释性附加信息是否需要独立字段承接，避免继续塞回同一字符串。

- [ ] 42. 收敛 `check-action-permission-closure.mjs` 为优先消费结构化 binding 的校验脚本
  - [ ] 先让脚本优先读取结构化 contract，再决定是否短期兼容旧字符串解析。
  - [ ] 继续校验：后端受保护路由是否存在绑定、catalog binding 是否命中真实 route。
  - [ ] 避免把脚本扩成大型静态分析器，优先保证 routeBindings 输入稳定可校验。

- [ ] 43. 执行最小验证并同步总结
  - [ ] 运行 `pnpm exec tsc --noEmit` 与 action closure 检查脚本。
  - [ ] 如脚本接入 `package.json` 或常用校验入口，再同步到文档。
  - [ ] 将结果补充到 `walkthrough.md`，并在必要时记录存量例外项。

## P1 action routeBindings 缺口补齐（2026-04-06，待确认）

- [ ] 45. 补齐 closure 脚本发现的 5 条未绑定后端受保护路由
  - [ ] 为 `action_trading_purchase_order_manage` 补 `POST /purchase/orders/:id/confirm-receipt`。
  - [ ] 为 `action_approval_config_manage` 补 `POST /workflows/definitions` 与 `POST /workflows/instances`。
  - [ ] 为 `action_approval_review` 补 `PATCH /workflows/tasks/:id/approve` 与 `PATCH /workflows/tasks/:id/reject`。

- [ ] 46. 重跑 closure 校验并确认未绑定缺口归零
  - [ ] 运行 `node scripts/check-action-permission-closure.mjs`。
  - [ ] 运行 `pnpm exec tsc --noEmit`。
  - [ ] 将结果同步到 `walkthrough.md`。

## P2 实验 / 沙箱模块长期常驻治理（2026-04-06，待确认）

- [ ] 49. 盘点实验 / 沙箱 / 临时验证模块在正式主链中的残留入口
  - [ ] 识别仍挂在正式 authenticated route 树中的实验模块，如 `experimental/*`。
  - [ ] 识别仍以正式模块名暴露但内部承接 sandbox 实现的入口，如 `system-management/logistics-api`。
  - [ ] 识别这些模块是否继续出现在生成路由目录、权限生成链、搜索入口与菜单/TAB 投影中。

- [ ] 50. 为每个目标项给出分类治理建议
  - [ ] 区分：转正保留、迁移到 labs/sandbox、从正式路由摘除但保留源码、确认无依赖后删除。
  - [ ] 明确哪些项只能摘“正式入口”，不能贸然删源码，避免影响后续排查与迁移。
  - [ ] 明确哪些项已经污染权限/搜索/生成链输入，应优先收敛。

- [ ] 51. 输出执行前规划并暂停等待确认
  - [ ] 将盘点结果与分类建议同步到 `implementation_plan.md`。
  - [ ] 明确本阶段只做规划，不直接删模块或改正式路由。
  - [ ] 完成后暂停，等待用户批准再进入执行阶段。

## P2 实验 / sandbox 源码路径语义迁移（2026-04-06，待确认）

- [ ] 58. 盘点需迁移到 `labs` / `sandbox` 语义路径的实验源码目录与 import 影响面
  - [ ] 识别 `src/features/experimental/**` 的组件、hooks、data、tabs 与 `/_authenticated/experimental/**` 的引用关系。
  - [ ] 识别 `src/features/logistics-api-sandbox/**` 的组件、services、types 与正式路由壳的引用关系。
  - [ ] 明确本轮只迁“源码目录语义”，不恢复正式入口。

- [ ] 59. 形成最小目录迁移方案
  - [ ] 为 `src/features/experimental/**` 设计更明确的目标目录，如 `src/features/labs/experimental/**`。
  - [ ] 为 `src/features/logistics-api-sandbox/**` 设计更明确的目标目录，如 `src/features/sandbox/logistics-api/**`。
  - [ ] 列出需要同步修改的 import、路由壳引用与可能受影响的生成文件。

- [ ] 60. 输出执行前规划并暂停等待确认
  - [ ] 将迁移方案、风险与验证预案同步到 `implementation_plan.md`。
  - [ ] 明确目录迁移属于结构级改动，执行前先暂停等待用户批准。
  - [ ] 批准后再进入实际 rename / import 更新 / 验证阶段。

## P2 兼容路径 / 键名升级专项（2026-04-06，待确认）

- [ ] 70. 规划 `/experimental/*` 路由别名与迁移策略
  - [ ] 明确目标命名空间与最终目标路径，避免继续沿用 `experimental` 作为正式语义。
  - [ ] 设计兼容期策略：是保留旧路由重定向，还是短期双挂载后再下线。
  - [ ] 明确权限生成链、搜索入口、导航入口应在迁移的哪一阶段切换。

- [ ] 71. 规划 `/experimental/*` API 命名升级策略
  - [ ] 盘点前端调用点与后端接口面，明确哪些接口需要别名兼容。
  - [ ] 设计兼容期：保留旧 API 别名还是由前端先切换、新旧共存一段时间。
  - [ ] 明确本轮不把“命名升级”扩成业务协议重构。

- [ ] 72. 规划 `experimental.*` i18n key 迁移策略并暂停等待确认
  - [ ] 设计新 key 命名空间，避免继续把 `experimental` 暴露为长期用户面语义。
  - [ ] 明确是否需要兼容旧 key、批量替换范围与验证方式。
  - [ ] 将专项方案、风险与验证预案同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 73. 切换为“直接清理旧 experimental 入口”专项并暂停等待确认
  - [ ] 明确本轮不再保留旧 `/experimental/*` 路由、旧 `/experimental/*` API alias 与旧 `experimental.*` 兼容消费层。
  - [ ] 盘点并清理旧入口涉及的文件：旧 authenticated experimental 路由壳、旧 route lazy 文件、旧 API 路径引用、旧 i18n key 消费点。
  - [ ] 明确需要同步删除或切换的生成产物与入口引用，避免删除后残留无效导入或 route tree 脏引用。
  - [ ] 将破坏性影响、验证步骤与回滚建议同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 74. 直接清理旧 experimental 路由入口
  - [ ] 删除 `src/routes/_authenticated/experimental/**` 下不再需要的旧路由文件。
  - [ ] 清理所有指向旧 `/experimental/*` 的前端导航与入口引用，统一改为 `/labs/experimental/*`。
  - [ ] 重新生成 route tree，确认删除旧路由后生成产物无残留引用。

- [ ] 75. 直接清理旧 experimental API 入口
  - [ ] 删除后端 `server/routes/routes.go` 中旧 `/experimental/*` 分组，仅保留 `/labs/experimental/*`。
  - [ ] 全量确认前端实验模块 API 调用均已切换到 `/labs/experimental/*`。

- [ ] 78. 实施可安全改名的 residual naming / 文案语义统一
  - [ ] 优先处理实验模块内部局部命名：组件名、函数名、hooks 命名、局部类型名、页面标题文案等。
  - [ ] 统一“实验中心 / labs / laboratory”相关用户面文案语义，避免同一模块多套表述并存。
  - [ ] 同步调整搜索关键词、菜单父级描述等低风险用户面语义文本。

- [ ] 79. 完成验证与文档整理
  - [ ] 执行 `pnpm exec tsc --noEmit`，必要时补充生成与定向搜索校验。
  - [ ] 更新 `walkthrough.md`，记录本轮 residual naming 收敛范围、保留项与验证结果。

- [ ] 80. 规划实验模块内部剩余命名债清理并暂停等待确认
  - [ ] 盘点 `src/features/labs/experimental/**` 内仍残留的 `use-experimental.ts`、`Lab*`、`Experimental*` 内部命名债。
  - [ ] 明确本轮仅处理内部函数名、hooks 名、局部类型名、组件名与文件内语义命名，不改路径、API 前缀、权限 ID、query key。
  - [ ] 将执行范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 81. 实施实验模块内部命名收敛
  - [ ] 统一 hooks 文件与导出命名，减少 `use-experimental.ts` 与 `useLab*` 混杂语义。
  - [ ] 统一实验模块页面、组件、局部类型中的 `Lab* / Experimental*` 命名风格。
  - [ ] 同步调整所有内部 import / export 引用，避免残留旧命名。

- [ ] 82. 验证并整理文档
  - [ ] 执行 `pnpm exec tsc --noEmit` 并搜索确认旧内部命名不再残留。
  - [ ] 更新 `walkthrough.md`，记录本轮内部命名收敛结果与保留项。

- [ ] 83. 规划实验模块 hooks 文件名收敛并暂停等待确认
  - [ ] 将 `src/features/labs/experimental/hooks/use-experimental.ts` 纳入文件名语义收敛范围。
  - [ ] 明确本轮仅处理文件名与 import 路径迁移，不改导出名、query key、API 路径、权限 ID。
  - [ ] 将执行范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 84. 实施 hooks 文件名迁移
  - [ ] 将 `use-experimental.ts` 重命名为更符合当前语义的文件名。
  - [ ] 同步更新所有内部 import 路径，确保调用方全部切换。

- [ ] 85. 验证并整理文档
  - [ ] 执行 `pnpm exec tsc --noEmit` 并搜索确认旧文件路径不再残留。
  - [ ] 更新 `walkthrough.md`，记录本轮文件名收敛结果与保留项。

- [ ] 86. 规划实验模块单文件 any 类型治理并暂停等待确认
  - [ ] 仅针对 `src/features/labs/experimental/hooks/use-lab-experimental.ts` 盘点 `any` 出现位置与最小替代类型方案。
  - [ ] 明确本轮不扩散到其他模块，不处理别的文件中的类型债。
  - [ ] 将执行范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 87. 实施 use-lab-experimental.ts 单文件 any 治理
  - [ ] 为 query 返回值、mutation 入参等位置补充最小可接受类型。
  - [ ] 保持 query key、API 路径、导出名与运行时行为不变。

- [ ] 88. 验证并整理文档
  - [ ] 执行 `pnpm exec tsc --noEmit`，必要时补充定向 lint 或搜索校验。
  - [ ] 更新 `walkthrough.md`，记录本轮单文件类型治理结果与保留项。

- [ ] 89. 规划“生产上线主链技术债治理”并暂停等待确认
  - [ ] 明确本轮主线仅覆盖正式生产链路中的认证 / 身份快照 / 用户 / 角色 / 权限链。
  - [ ] 明确本轮不将实验模块、sandbox 业务线、历史兼容清理、局部文案与命名美化混入正式主战场。
  - [ ] 将治理目标、阶段划分、风险、验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 90. 第一阶段：生产主链接口契约与类型收口
  - [ ] 盘点正式生产主链中返回结构、分页契约、options 轻量契约、patch / replace / snapshot 等语义漂移点。
  - [ ] 将认证快照权威入口收敛为 `GET /auth/snapshot`，直接删除旧 `GET /profile`，不保留兼容入口。
  - [ ] 优先治理认证 / 身份 / 用户 / 角色 / 权限链的前后端契约与前端 service 类型。
  - [ ] 建立“服务层稳定 contract -> hooks 消费 -> 页面承接”的单向边界，减少页面层自行猜结构。

- [ ] 91. 第二阶段：生产权限与职责边界收口
  - [ ] 固化“服务端为最终权限裁决来源、前端仅做展示与状态承接”的正式基线。
  - [ ] 收敛 service / hook / page / component 以及 handler / service / repository 的职责边界，减少跨层混杂。
  - [ ] 清理正式主链中仍可能诱导误用的边界命名、注释或旧约定。

- [ ] 92. 第三阶段：生成链 / 配置链 / 校验链稳定化
  - [ ] 收敛权限生成、路由 catalog、action binding、默认权限清单等认证 / 用户 / 权限链相关生成输入与运行时消费边界。
  - [ ] 补强脚本校验与定向验证，避免“生成输入、生成产物、运行时消费、人工理解”再次漂移。

- [ ] 93. 第四阶段：文档基线与上线治理总结
  - [ ] 拆分“当前执行文档”和“长期架构基线文档”的职责，避免 `walkthrough.md` 继续承担全部历史语义。
  - [ ] 更新 `walkthrough.md`，记录正式生产主链治理结果、保留项、风险与验证结论。

- [ ] 94. 规划“角色矩阵 -> 新增用户 -> 登录访问范围”真实链路回归并暂停等待确认
  - [ ] 明确本轮验证主链仅覆盖：角色矩阵修改部门角色权限、用户新增时自动绑定 `org_<dept>` 部门角色、登录后真实访问范围随角色变化生效。
  - [ ] 明确本轮不扩展为前端路由守卫改造，不把前端变成权限裁决源。
  - [ ] 将涉及的前后端入口、测试补强点、风险与验证步骤同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 95. 第一阶段：角色矩阵改权限真实链路回归
  - [ ] 盘点并验证 `useRoles` / `RoleService` / `role_handlers.go` 在角色矩阵勾选权限后的保存、回读与刷新一致性。
  - [ ] 补强“修改部门角色权限后重新读取角色 contract 仍一致”的前后端回归测试。
  - [ ] 明确本阶段以“后端返回稳定 role contract”为验收标准，不允许前端静默兜底回写。

- [ ] 96. 第二阶段：新增用户绑定部门角色真实链路回归
  - [ ] 验证新增用户时，员工所属部门存在 `org_<dept>` 角色会被自动绑定；缺失时直接报错阻断保存。
  - [ ] 补强 `users-action-dialog` / `use-users-action-dialog-sync` / 用户创建 handler 的联动回归测试。
  - [ ] 确认最终写入用户记录的 role 标识与当前部门角色 contract 一致。

- [ ] 97. 第三阶段：登录后真实访问范围验证
  - [ ] 盘点登录鉴权、身份快照、有效权限解析链：`/auth/snapshot`、effective access、middleware、角色权限解析服务。
  - [ ] 补强“部门角色权限变化后，登录态读取到的新访问范围随之变化”的后端回归测试。
  - [ ] 必要时补最小前端 service 层验证，确认身份快照消费的是服务端真实权限结果而非页面本地推导。

- [ ] 98. 第四阶段：执行验证并整理文档
  - [ ] 执行本轮定向 `vitest` / `go test` / `pnpm exec tsc --noEmit`。
  - [ ] 更新 `walkthrough.md`，记录真实链路回归结果、未覆盖项与后续保留风险。

- [ ] 99. 规划“权限核心逻辑抽离专项”并暂停等待确认
  - [ ] 先确认本轮主问题不是单点 bug，而是角色解析、部门角色绑定、有效权限计算、snapshot 回填、页面显示解释在多层重复实现。
  - [ ] 明确本轮优先级从“继续补真实链路回归”切换为“先抽离底层核心逻辑，再做链路验证”。
  - [ ] 将抽离目标、职责边界、迁移阶段、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 100. 第一阶段：收口后端权限核心
  - [ ] 将“用户主角色 + 部门角色族 + 有效权限集合 + effectiveRoles”统一收口为单一后端核心服务，避免 handler / middleware 各自 fallback。
  - [ ] 约束 `auth snapshot`、middleware、角色接口与用户接口只消费该核心结果，不再各自重复解析。
  - [ ] 明确任何 `org_<dept>` 相关角色家族合并逻辑只能存在一处权威实现。

- [ ] 101. 第二阶段：收口前端角色消费边界
  - [ ] 将前端划分为“写侧”与“读侧”：
  - [ ] 写侧只负责提交角色标识与权限变更，不推导有效权限。
  - [ ] 读侧只消费后端返回的稳定 contract，不再本地二次裁决权限。
  - [ ] 约束用户新增绑定、角色矩阵、用户表显示解释分别使用同一套只读 contract / resolver 边界。

- [ ] 102. 第三阶段：清理重复 fallback / 解释层
  - [ ] 排查并删除 handler、middleware、snapshot、前端页面中重复的 fallback 逻辑与隐式兜底。
  - [ ] 将页面层残留的 role drift / role resolver 解释限制为展示用途，不再参与真实权限裁决。
  - [ ] 确认登录、用户新增、角色矩阵三条链只沿同一事实来源流动。

- [ ] 103. 第四阶段：在抽离完成后再做真实链路回归
  - [ ] 回到“角色矩阵改权限 -> 新增用户绑定部门角色 -> 登录后访问范围验证”做最终回归。
  - [ ] 用定向 `vitest` / `go test` / `pnpm exec tsc --noEmit` 验证抽离后的单源逻辑真正闭环。
  - [ ] 更新 `walkthrough.md`，记录本轮抽离结果、保留项与真实链路验证结论。

- [ ] 104. 规划 `use-roles.ts` 专项收口并暂停等待确认
  - [ ] 确认 `src/features/system-mgmt/hooks/use-roles.ts` 仍包含前端本地权限扩展 / 默认权限补齐 / admin 全量补齐等第二套解释逻辑。
  - [ ] 明确本轮目标不是改页面表现，而是把 `use-roles.ts` 拆成两层：
  - [ ] “展示树辅助层”：仅服务权限树勾选 UI、父子节点展开/联动显示。
  - [ ] “后端 contract 消费层”：仅保存和消费后端返回的真实 `role.permissions` contract，不再本地补齐为持久化事实。
  - [ ] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 105. 第一阶段：拆分 `use-roles.ts` 的双重职责
  - [ ] 从 `use-roles.ts` 中拆出“展示树辅助”工具，承载父子节点关系、排序、勾选联动等纯 UI 辅助逻辑。
  - [ ] 保留 `use-roles.ts` 作为后端角色 contract 的消费者，不再在加载后对 `role.permissions` 做持久化语义上的二次扩展。
  - [ ] 明确哪些值属于 UI 临时显示集合，哪些值属于后端返回/提交的真实权限集合。

- [ ] 106. 第二阶段：收口角色矩阵写侧
  - [ ] 调整角色矩阵勾选保存逻辑，使提交 payload 只表达后端 contract，而不是前端补齐后的整棵权限树。
  - [ ] 保留必要的页面交互体验，但禁止默认权限补齐 / admin 全量补齐继续作为前端事实来源。
  - [ ] 复查 `RoleService`、角色矩阵 hooks / tabs，确认不再存在另一套持久化权限解释。

- [ ] 107. 第三阶段：补回归测试与验证
  - [ ] 增加 `use-roles` 专项回归测试，锁住“展示树辅助”与“后端 contract 消费”边界。
  - [ ] 验证角色加载、勾选、保存、重新加载后不再因为前端本地扩展而漂移。
  - [ ] 执行定向 `vitest` / `pnpm exec tsc --noEmit`，必要时补后端 handler 合同验证。
  - [ ] 更新 `walkthrough.md`，记录本轮 `use-roles.ts` 专项收口结果与剩余保留项。

- [ ] 108. 规划 `effectiveRoles / role` snapshot 兼容链专项收严并暂停等待确认
  - [ ] 确认当前剩余弱冗余主要集中在 snapshot contract 的兼容层：后端 `GetAuthSnapshotHandler`、前端登录写入、`effective-permission-service`、`access-snapshot` 对 `role` 的回退读取。
  - [ ] 明确本轮目标是“让前后端优先只消费 `effectiveRoles`”，并把 `role` 从兼容事实链降级为过渡字段。
  - [ ] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 109. 第一阶段：收严后端 snapshot 输出语义
  - [ ] 复查 `server/handlers/auth.go` 中登录响应与 `/auth/snapshot` 输出，明确 `effectiveRoles` 为角色事实来源。
  - [ ] 减少 `effectiveRoles <- role` 的兼容回填，避免 snapshot 继续在 handler 层做结构修补。
  - [ ] 保留必要过渡兼容，但要求权限与页面链的主消费逻辑不再依赖 `role`。

- [ ] 110. 第二阶段：收严前端 snapshot 写入与读取链
  - [x] 调整登录成功后的前端写入逻辑，优先以 `effectiveRoles` 为准，不再把 `role` 作为主读取来源。
  - [x] 调整 `effective-permission-service.ts` 与 `access-snapshot.ts`，限制 `role` fallback 的作用范围。
  - [x] 确认页面与 hooks 的角色读取工具优先消费 `effectiveRoles`，避免继续混用 `role/effectiveRoles`。

- [ ] 111. 第三阶段：补回归测试与验证
  - [x] 增加后端 snapshot contract 回归测试，锁住 `effectiveRoles` 主来源行为。
  - [x] 增加前端登录 / snapshot 同步 / access-snapshot 回归测试，锁住 `effectiveRoles` 主消费行为。
  - [x] 执行定向 `go test` / `vitest` / `pnpm exec tsc --noEmit`。
  - [x] 更新 `walkthrough.md`，记录本轮 snapshot 兼容链收严结果与剩余保留项。

- [ ] 112. 规划 compatibility-only 边界收口并暂停等待确认
  - [x] 确认当前剩余仅为 compatibility / display / UX assist 层保留项，不再属于权限事实来源。
  - [x] 明确本轮只聚焦三个尾部点：`getSnapshotRoleIds(...)`、`auth-session.ts`、登录链 fallback / resilience 处理。
  - [x] 明确本轮目标不是继续改权限裁决，而是进一步标注、压缩、隔离 compatibility-only 边界。
  - [x] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 113. 第一阶段：压缩 snapshot 兼容读取边界
  - [x] 复查 `getSnapshotRoleIds(...)` 与 `auth-session.ts` 的调用点，明确其仅用于宽兼容读取或 display 辅助。
  - [x] 视情况将其重命名、收窄使用面，或改为更薄的 compatibility wrapper。
  - [x] 禁止新的主链逻辑继续依赖这类宽兼容读取函数。

- [ ] 114. 第二阶段：压缩登录链 fallback / resilience 边界
  - [x] 复查登录成功后的最小身份写入与 snapshot 同步失败处理，明确哪些保留是 resilience，哪些属于历史兼容。
  - [x] 尽量把 fallback 处理压缩为最小必要路径，避免继续混入角色事实链。
  - [x] 保留必要稳定性，但将其限定为 compatibility-only / transition-only。

- [ ] 115. 第三阶段：补回归测试与验证
  - [x] 补 compatibility-only 边界专项测试，锁住这些函数/流程不再被抬升为事实来源。
  - [x] 执行定向 `vitest` / `pnpm exec tsc --noEmit`，必要时补最小后端 handler 验证。
  - [x] 更新 `walkthrough.md`，记录本轮 compatibility-only 边界收口结果与最终保留项。

- [ ] 116. 规划“系统管理重复账号 TAB 下线 + 路由重定向”并暂停等待确认
  - [x] 确认 `/personnel/accounts` 与 `/system-management/accounts` 当前共用同一个 `Users` 底层页面，系统管理下的“用户账号”属于重复入口壳。
  - [x] 明确本轮目标不是改用户页业务逻辑，而是收口信息架构：移除系统管理中的重复 TAB，同时保留历史路由入口做兼容重定向。
  - [x] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 117. 第一阶段：移除系统管理中的重复 TAB
  - [x] 调整 `src/features/system-mgmt/tab-config.ts`，下线系统管理中的“用户账号”TAB。
  - [x] 保留人事账号中心中的“账户列表”作为唯一主入口。
  - [x] 确认不会影响系统管理其余 TAB 的展示与切换。

- [ ] 118. 第二阶段：保留历史路由并重定向
  - [x] 调整 `src/routes/_authenticated/system-management/accounts.tsx`，不再直接渲染 `Users`。
  - [x] 将 `/system-management/accounts` 重定向到 `/personnel/accounts`。
  - [x] 尽量保留当前 search 参数，避免旧书签与历史跳转失效。

- [ ] 119. 第三阶段：补验证与文档
  - [x] 验证系统管理 TAB 已不再出现重复账号入口。
  - [x] 验证访问 `/system-management/accounts` 时会正确跳转到 `/personnel/accounts`。
  - [x] 执行定向 `vitest` / `pnpm exec tsc --noEmit`。
  - [x] 更新 `walkthrough.md`，记录重复入口下线与兼容重定向结果。

- [ ] 120. 规划“最终全链弱冗余残留审计”并暂停等待确认
  - [ ] 基于当前已完成的后端单源、compatibility-only 边界收口与重复入口收口，重新梳理前端剩余残留项。
  - [ ] 聚焦仍可能造成误解的 compatibility / display / UX assist / legacy route 残留，不扩大到新的权限裁决改造。
  - [ ] 输出剩余项分层清单：必须处理、建议处理、可保留。
  - [ ] 将方案、范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户确认是否进入下一轮审计/实现。

- [ ] 121. 规划“删除未使用 legacy alias”并暂停等待确认
  - [ ] 复查 `getSnapshotRoleIds(...)` 与 `getAuthSessionRoleIds(...)` 的全局调用点，确认已无业务调用，仅剩定义本身与测试引用。
  - [ ] 明确本轮目标是删除未使用的 legacy alias，而不是继续保留兼容壳；系统内只保留显式的 compatibility-only 入口。
  - [ ] 同步调整受影响测试，移除“legacy alias 仍保留”的断言，改为锁住显式 compatibility-only 入口语义。
  - [ ] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户确认后实施。

- [ ] 122. 第一阶段：删除未使用 legacy alias 导出
  - [ ] 调整 `src/features/authz/core/access-snapshot.ts`，删除 `getSnapshotRoleIds(...)`。
  - [ ] 调整 `src/features/authz/utils/auth-session.ts`，删除 `getAuthSessionRoleIds(...)`。
  - [ ] 确认现有业务代码仅保留显式 compatibility-only 与 effectiveRoles 主链读取入口。

- [ ] 123. 第二阶段：补测试与文档
  - [ ] 调整 `access-snapshot.test.ts` 与 `auth-session.test.ts`，删除 legacy alias 存续断言。
  - [ ] 执行定向 `vitest` / `pnpm exec tsc --noEmit` 验证删除后无引用残留。
  - [ ] 更新 `walkthrough.md`，记录 legacy alias 删除结果与最终保留边界。

- [ ] 124. 规划“前端消费边界制度化”并暂停等待确认
  - [ ] 明确本轮目标不再是零散残留清理，而是把前端权限消费链按职责制度化分层。
  - [ ] 明确分层目标：主链 contract 消费层、compatibility-only 层、display/UX assist 层、legacy route/redirect 层。
  - [ ] 明确本轮不引入新的前端权限硬拦截；权限裁决仍以后端为准，前端只做 contract 消费边界收口。
  - [ ] 将方案、风险、涉及文件范围与验证策略同步到 `implementation_plan.md` 后暂停，等待用户确认。

- [ ] 125. 第一阶段：梳理并固化前端权限消费分层
  - [ ] 盘点 `src/features/authz/**`、`src/components/layout/**`、`src/components/layout/data/**`、`src/features/system-mgmt/**` 中的权限相关读取入口。
  - [ ] 将读取入口按“主链 contract / compatibility-only / display-only / UX assist / legacy route”分类。
  - [ ] 输出统一的边界规则，明确哪些层允许读什么字段、哪些层禁止再派生权限事实。

- [ ] 126. 第二阶段：收口共享入口与命名语义
  - [ ] 对仍存在语义混杂的 helper / service / route helper 做职责拆分或命名收严。
  - [ ] 优先把“像主链、实则只是展示/兼容”的入口改成更明确的层级表达。
  - [ ] 若发现多个模块重复承接相同消费职责，尽量收敛到单一共享入口。

- [ ] 127. 第三阶段：收口 layout / sidebar / tabs / route 配置层弱规则
  - [ ] 复查 layout、sidebar、tab、route catalog 相关配置是否仍混入权限事实解释或历史兼容歧义。
  - [ ] 清理低风险无效分支、失效配置与误导性命名。
  - [ ] 保留必要 legacy route/redirect，但要求表达上显式为 compatibility-only。

- [ ] 128. 第四阶段：补验证与制度化记录
  - [ ] 为关键 shared helper / boundary function 补最小回归测试，锁住主链与 compatibility/display 层隔离。
  - [ ] 执行定向 `vitest` / `pnpm exec tsc --noEmit`，必要时补最小 smoke 验证。
  - [ ] 更新 `walkthrough.md`，记录最终消费边界分层、已收口点与有意保留项。

- [ ] 129. 第三批专项：`route-access / route tab` 投影层语义收口（审批稿）
  - [ ] 复核 `src/features/authz/guards/route-access.ts` 的真实职责，明确其属于“权限快照投影/匹配工具”，不是前端权限事实裁决主链。
  - [ ] 梳理 `canAccessPath / getAccessibleTabs / getRequiredPermissionIdsForPath` 的业务调用面，区分哪些是 Tab 过滤、哪些是路由配置投影、哪些仍可能带有误导性命名。
  - [ ] 若确认需要重命名，只收口表达与共享入口，不新增任何新的前端硬拦截逻辑。
  - [ ] 若调用面仍依赖当前名字，则采用“新语义入口 + 过渡迁移 + 最终删除旧名”的渐进方式推进。
  - [ ] 输出第三批保留项：明确哪些 helper 仍允许存在，且只能被视为“基于快照的前端投影工具”，不能被继续当作权限裁决器。

- [ ] 130. 缺陷修复：产线拓扑保存未携带 `authCode` 且 403 提示语义混淆（审批稿）
  - [ ] 复核“手动搭建首个工段”到 `POST /production/lines` 的完整调用链，确认保存已有产线拓扑时需要携带授权码。
  - [ ] 为产线拓扑编辑/保存链路补齐前端授权码传递，确保已有产线编辑时能把 `authCode` 提交到后端。
  - [ ] 复核现有 403 错误映射，区分“权限不足”与“拓扑授权码无效”两类拒绝原因，避免统一提示误导用户。
  - [ ] 保持“后端为权限/授权事实来源”的原则，不新增前端硬裁决，仅补齐交互与错误展示。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录缺陷根因、修复点与保留项。

- [ ] 131. 缺陷修复：`/engineering/products` 页面文案单语化与中英模式对齐（审批稿）
  - [ ] 复核 `src/features/engineering/index.tsx` 与 `src/features/engineering/components/engineering-sidebar.tsx` 的可见文案来源，区分“语言包输出”“硬编码标签”“内部 token 直出”三类问题。
  - [ ] 清理 `src/locales/messages/zh-CN/engineering.ts` 与 `src/locales/messages/en-US/engineering.ts` 中 `engineering.productMgmt` 下的双语拼接文案，改为中文模式纯中文、英文模式纯英文的单语文案。
  - [ ] 去除页面组件对翻译结果的 `split(' / ')` / `split(' // ')` 依赖，避免把翻译字符串当作结构化数据再次拆分渲染。
  - [ ] 将 `OVERVIEW`、`ROUTING`、`SPEC:`、`NULL_CONSTRAINTS` 等硬编码或技术占位文本纳入 i18n，避免内部标识符直接暴露到 UI。
  - [ ] 保持页面现有结构、交互与权限链路不变，只修正文案来源与渲染策略，不扩展为视觉重构。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录根因、修复边界、验证结果与有意保留项。

- [ ] 132. 延续修复：`productMgmt` 其余表单 / 详情区中英混排残留清理（审批稿）
  - [ ] 复核 `src/locales/messages/zh-CN/engineering.ts` 与 `src/locales/messages/en-US/engineering.ts` 中 `engineering.productMgmt` 尚未收口的双语拼接字段，重点覆盖详情区、弹窗、表单、限制标签、附件区与条码区入口文案。
  - [ ] 梳理这些 key 在 `product-overview-tab`、`product-action-dialog`、相关子组件中的真实消费面，避免只改语言包而遗漏仍依赖旧双语格式的组件。
  - [ ] 将剩余面向用户可见的 `PRODUCT_*`、`EDIT_*`、`LIVE_PREVIEW`、`UPLOAD_*`、`PRINT_*` 等 token 风格文案改为真正单语，不再直接上屏内部标识符。
  - [ ] 若存在组件继续依赖旧格式（如假定文案中同时含英文与中文），则同步去除对应的结构化拆分或格式假设。
  - [ ] 保持产品详情、创建/编辑弹窗、附件与条码交互逻辑不变，只清理文案来源与渲染方式，不扩展为表单结构或视觉重构。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录本轮继续清理范围、验证结果与仍有意保留的 mixed 文案边界。

- [ ] 133. 结构收口：人事账号中心产线管理 TAB 统一为 `产线 -> 工段 -> 工序`（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/line-mgmt/**` 当前前端类型、组件 props、hook 命名与 UI 文案，确认哪些仍混用 `job / jobCategory / process / station` 抽象。
  - [ ] 明确人事账号中心产线管理 TAB 的唯一前端展示语义为 `产线 -> 工段 -> 工序`，去除当前共享页中把中间层误映射为 `工种 / 岗位类别` 的表达与命名。
  - [ ] 梳理前端保存 payload 与后端 `ProductionLine -> LineSegment -> JobCategory -> Station -> ProcessStep` 真实模型之间的差异，决定采用“前端投影适配”方式在不破坏现有后端模型的前提下收口展示与提交。
  - [ ] 统一列表统计、节点新增/重命名/删除动作与拓扑编辑器，使用户侧只能感知 `工段` 与其下 `工序`，不再暴露错层级概念。
  - [ ] 保持授权码、保存冲突、版本控制与权限链路不变，不扩展为整套生产拓扑后端重构。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录当前偏移根因、前端投影方案、验证结果与后端仍保留的深层模型边界。

- [ ] 134. 架构净化：产线拓扑三层模型彻底去兼容壳（审批稿）
  - [ ] 复核 `line-mgmt`、`topology-template`、`work-architecture`、`production-resource-service` 等共享消费面，识别当前仅为兼容旧后端五层结构而保留的 `jobCategories / stations / 投影折叠展开` 壳层。
  - [ ] 将前端共享 contract 真正统一为 `ProductionLine -> Segment -> ProcessStep`，不再让 `jobCategories` 作为前端主类型的一部分存在。
  - [ ] 将当前资源服务中的读取折叠 / 保存展开逻辑升级为显式 adapter 或 contract 层，并评估是否需要同步调整后端返回 contract，避免业务组件继续依赖隐式兼容转换。
  - [ ] 清理 `topology-template`、`work-architecture` 等共享模块中仍直接消费旧层级概念的类型与命名，确保三层模型在共享前端侧一致。
  - [ ] 明确哪些后端深层结构属于历史保留、哪些需要新增独立接口或只读 projection，避免继续让前端页面承担“猜测后端层级”的职责。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录去兼容壳边界、受影响模块、验证结果与仍明确延后的后端重构项。

- [ ] 135. 后端统一：产线拓扑 API / persistence model 收口为 `产线 -> 工段 -> 工序`（审批稿）
  - [ ] 复核 `server/models/production.go`、`server/services/production_service.go`、对应 handler / route / repository，明确当前后端五层结构中哪些属于真实持久化需求，哪些只是历史抽象残留。
  - [ ] 设计统一三层后端 contract：对前端返回与接收的产线拓扑统一为 `ProductionLine -> Segment -> ProcessStep`，不再要求前端理解 `JobCategory / Station` 中间层。
  - [ ] 明确 persistence model 的迁移策略：是直接调整数据库与模型结构，还是保留底层表结构并在服务层建立后端防腐映射，分阶段去掉五层外露 contract。
  - [ ] 评估并列出受影响的后端消费链：产线保存、回填、权限校验、拓扑模板、work architecture、wheel trace 或其它读取生产拓扑的服务。
  - [ ] 明确兼容与迁移方案：旧数据如何迁移、旧接口如何退场、是否需要新增版本化 API 或一次性替换现有 `/production/lines` contract。
  - [ ] 完成前后端最小验证并更新 `walkthrough.md`，记录 contract 变化、迁移边界、回滚思路与明确排除项。

- [ ] 136. 站点能力映射子域重命名 / 重建模，并拆除旧表旧接口（审批稿）
  - [ ] 复核 `models.Station`、`station_process_mappings`、`production_station_mapping_handlers.go`、`work-architecture` 相关调用链，明确“站点能力映射”是否应独立为新的子域，而不再挂靠旧 `JobCategory / Station` 命名体系。
  - [ ] 设计新的领域命名与模型边界：明确旧 `Station`、旧 `station_process_mappings`、旧 `/production/mappings` 接口各自将被什么新实体与新接口替代。
  - [ ] 明确数据迁移策略：旧表如何迁移到新表、旧 ID 如何保留或映射、历史能力映射如何防止丢失或重复。
  - [ ] 明确拆除清单：哪些旧表、旧模型字段、旧 repository 方法、旧 handler / route、旧前端服务接口将在本轮被删除。
  - [ ] 评估受影响消费链：`work-architecture`、产线保存回填、wheel trace、团队/班组关联、其它直接读取站点能力映射的服务。
  - [ ] 完成迁移验证并更新 `walkthrough.md`，记录新旧模型对照、迁移脚本、回滚方案与明确排除项。

- [ ] 137. 定向修复 `production-shared / scan-platform` 当前 TypeScript 编译错误（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/work-architecture/components/station-node.tsx`、`use-work-architecture.ts` 与 `station-capabilities-dialog.tsx`，确认当前 `station` 语义与 `job` 能力映射接口之间的漂移边界。
  - [ ] 复核 `src/features/scan-platform/contracts/wheel-trace-gateway-contract.ts`、`models/wheel-trace.ts` 与 `examples/wheel-trace/mock-wheel-trace-gateway.ts`，确认 `currentStage` / `timeline` mock 数据与最新三层 contract 的差异。
  - [ ] 设计最小修复方案：仅修正目标调用点与 mock/props 字段，使其重新对齐现有 contract，不在本轮扩展到更大范围的站点能力重建模。
  - [ ] 执行定向 TypeScript 验证并更新 `walkthrough.md`，记录本轮变更点、验证结果与明确未处理项。

- [ ] 138. 加固 `.gitignore`，避免本地敏感文件 / 运行时目录 / 工具缓存被误传服务器（审批稿）
  - [ ] 复核当前 `.gitignore` 已覆盖项与本地实际存在的 ignored 文件，明确哪些敏感文件、缓存目录、运行时产物仍有补充空间。
  - [ ] 设计最小加固方案：只补充高风险且明确不应入库/不应随源码上传服务器的规则，不改动已存在的业务源码跟踪策略。
  - [ ] 执行定向验证，确认新增规则能覆盖目标文件/目录，并记录仍建议通过“仅传 Git 跟踪文件”规避的部署风险。

 - [ ] 139. 定向修复 `DMPreview` 二维码渲染参数透传 `undefined` 导致 bwip-js 报错（审批稿）
  - [ ] 复核 `src/features/basic-settings/components/dm-preview.tsx` 当前 `bwipjs.toCanvas(...)` 参数构造方式，确认 `qrcode` 与 `datamatrix` 分支是否显式透传了 `height: undefined`、`eclevel: undefined` 等非法 option。
  - [ ] 将条码渲染配置改为“按码制条件追加字段”的显式构造方式：公共字段与 `code128` 专属字段、`qrcode` 专属字段分离，避免把 `undefined` 作为 option 值传给 `bwip-js`。
  - [ ] 保持 `DMPreview` 现有 UI、canvas 尺寸、短码展示、后缀标签与视觉布局不变，不扩展为组件重构或条码样式重设计。
  - [ ] 重点验证 `qrcode`、`datamatrix`、`code128` 三类预览都能正常渲染，且控制台不再出现 `bwipp.invalidOptionType` / `height: not a realtype: undefined`。
  - [ ] 补充最小静态验证并更新 `walkthrough.md`，记录本轮根因、修复方式、验证结果与明确未处理项。

- [ ] 140. 架构大瘦身：产线拓扑唯一合法层级收口为 `产线 -> 工段 -> 工序`（审批稿）
  - [ ] 复核 `server/models/production.go`、`server/repositories/production_repository.go`、`server/services/production_service.go`、`server/services/production_line_contract.go` 与前端 `src/features/production-shared/**`，确认当前仍残留的 `JobCategory` / `Station` 定义、预加载、DTO 回退与 UI 错层级命名。
  - [ ] 以“只有产线-工段-工序，其他层级均为冗余且错误”为单一事实来源，重写本轮边界：`JobCategory`、`Station` 不再作为主产线拓扑链的合法层级存在。
  - [ ] 将本轮执行拆成两段：一段收口主产线拓扑后端 contract / 持久化链，另一段评估旧 `Station` 能力映射是否应独立成新子域，而不是继续挂在主拓扑模型下。
  - [ ] 明确本轮高风险点：历史数据降维、旧接口退场、模板/工艺架构消费面联动、隐藏依赖排查不足导致的静默回归。
  - [ ] 在用户审批前不修改业务代码，只输出经过代码证据验证后的中文实施清单、风险、验证方案与确认点。

- [ ] 141. 后端主链收口：删除产线拓扑中的 `JobCategory / Station` 冗余层（审批稿）
  - [ ] 复核 `LineSegment.JobCategories`、`JobCategory`、`Station` 在 GORM 模型、预加载、保存事务、关联清理与 DTO 映射中的真实职责，区分“主拓扑冗余”与“其它子域借用”的边界。
  - [ ] 设计主产线拓扑唯一 contract：`ProductionLine -> LineSegment -> ProcessStep`，对外返回与保存均不再暴露 `jobCategories`、`stations`、折叠回退或兼容壳。
  - [ ] 规划后端代码改动：移除 `LineSegment` 上对 `JobCategory` 的主链依赖，删除产线保存链中 `DeleteJobCategoriesNotIn`、`DeleteProductionStationsNotIn`、相关 ID 收集与 DTO fallback 逻辑。
  - [ ] 评估数据库/持久化策略：若本轮不直接删表，也要明确这些表已退出主拓扑；若直接删表/删模型，则必须给出迁移、回滚与历史数据落点方案。
  - [ ] 识别所有受影响消费方：`/production/lines` 相关 handler/service/repository、前端 `line-mgmt`、`topology-template`、`work-architecture`、以及任何直接依赖旧层级字段的测试与适配代码。
  - [ ] 明确验证方案：后端定向 `go test`、前端 `pnpm exec tsc --noEmit`、目标文件 `eslint`、以及保存/回填/空树/历史数据读取场景验证。

- [ ] 142. 旧站点能力映射去耦：`Station` 不再挂靠主产线拓扑（审批稿）
  - [ ] 复核 `AssignProcessToStation`、`RemoveProcessFromStation`、`ListStationMappings`、`station_process_mappings`、`work-architecture` 等链路，确认哪些能力确实仍需要“站点/能力映射”子域，哪些只是历史命名残留。
  - [ ] 明确架构原则：即使保留某种“能力映射”实体，它也不能再作为主产线拓扑的中间层解释 `工段 -> 工序` 关系。
  - [ ] 设计下一步子域策略：独立重命名、独立接口、独立表/映射关系，或在确认无人消费后彻底删除旧 `Station` 链路。
  - [ ] 列出本轮暂不执行但必须预警的破坏性动作：删旧表、删旧 handler / route、删旧前端能力映射 UI、迁移历史映射数据。
  - [ ] 在 `walkthrough.md` 中预留验证与迁移记录位置，确保后续真正执行时可追溯主拓扑收口与子域拆分的边界。

- [ ] 143. 未消费历史壳归档：清理 `line-mgmt` 下遗留 `station-node` 文件（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/line-mgmt/components/topology/station-node.tsx` 与 `topology-editor/station-node.tsx` 的真实消费情况，确认不存在静态 import、barrel 再导出、测试引用或动态装配依赖。
  - [ ] 将本轮范围严格限定为“未消费历史壳归档”，不触碰 `work-architecture/components/station-node.tsx` 与后端 `Station` 能力映射子域。
  - [ ] 设计归档式清理策略：优先直接删除两份无人消费文件；若发现仍有隐式依赖，则退回为“去入口暴露 + 文档标注待删”，避免误删活跃链路。
  - [ ] 明确风险点：路径删除可能影响 IDE 历史引用、未来未提交分支的旧 import、以及人肉回忆式复用；需通过全仓检索与 TypeScript 编译共同兜底。
  - [ ] 明确验证方案：执行 `grep_search` 复核 `station-node` 引用、执行 `pnpm exec tsc --noEmit` 验证删除后无编译回归，并更新 `walkthrough.md` 记录归档结果。
  - [ ] 在用户审批前不删除业务文件，只输出归档范围、执行策略、风险与确认点。

- [ ] 144. 活跃链路净化：收口 `work-architecture` 中 `station / job` 命名漂移（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/work-architecture/components/station-node.tsx`、`station-capabilities-dialog.tsx`、`process-capability-node.tsx`、`hooks/use-work-architecture.ts` 与 `production-resource-service.ts` 的当前职责，区分“独立能力映射节点”与“旧主拓扑层级残留命名”。
  - [ ] 将本轮范围限定为前端活跃链路命名净化：统一节点 props、回调名、局部变量名与用户可见文案，避免继续混用 `station / job / process` 误导语义。
  - [ ] 明确接口边界：若后端 `/production/mappings` 当前请求体仍使用 `stationId`，则本轮仅在前端通过中性命名或 adapter 隔离该字段，不直接扩展为后端接口重命名。
  - [ ] 优先处理活跃调用面中的误导命名，如 `jobId / jobName`、`StationCapabilitiesDialog`、`assignProcessToJob / removeProcessFromJob` 与相关 props/局部变量，使其与“能力映射节点”语义一致。
  - [ ] 明确风险点：`work-architecture` 为活跃页面，命名调整若边界不清，可能引发 props 错传、能力映射弹窗失效或 TypeScript 联动错误。
  - [ ] 明确验证方案：执行 `pnpm exec tsc --noEmit`，并补充全仓检索确认 `work-architecture` 活跃链路中的目标旧命名已被收口，同时更新 `walkthrough.md` 记录本轮边界与保留项。
  - [ ] 在用户审批前不修改业务代码，只输出执行范围、改名策略、风险与确认点。

 - [ ] 145. 活跃文件名收口：重命名 `work-architecture/components/station-node.tsx`（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/work-architecture/components/station-node.tsx` 的真实消费面，确认静态 import、路径引用与导出名已经可安全切换到新的中性文件名。
  - [ ] 将本轮范围限定为“文件名与引用入口收口”，不借机扩展到其它组件批量更名或后端 `Station` 子域改造。
  - [ ] 拟定目标文件名为能力映射中性语义，例如 `capability-mapping-node.tsx`，并保持文件内部导出名与文件名一致，避免继续出现“文件名仍叫 station、导出已叫 capability” 的语义断裂。
  - [ ] 明确风险点：文件重命名会影响 import 路径、IDE 打开历史、未提交分支上的旧引用以及大小写/路径缓存问题，需要通过全仓检索与 TypeScript 编译共同兜底。
  - [ ] 明确验证方案：更新所有引用后执行 `pnpm exec tsc --noEmit`，并检索确认 `work-architecture` 活跃链路中不再残留 `./station-node` 的真实引用。
  - [ ] 在用户审批前不执行文件重命名，只输出目标文件名、引用调整范围、风险与确认点。

- [x] 146. DTO 升级断链分析：恢复 `production_topology_handlers.go` / `production_service.go` 产线拓扑保存链（已完成）
  - [x] 已复核 `server/handlers/production_topology_handlers.go`、`server/services/production_service.go`、`server/services/production_service_test.go` 与相关 repository/model，确认当前 `SaveProductionLineHandler -> SaveProductionLine -> repository.SaveProductionLine` 的真实 contract。
  - [x] 已确认断链根因：当前代码仍引用 `services.ProductionLineDTO`、`mapProductionLineDTOToModel`、`mapProductionLineToDTO`、`mapProductionLinesToDTO`，但仓内已无这些 DTO/映射定义落点，说明 DTO 升级后主 handler/service 未完成同步迁移。
  - [x] 已按单一后端 DTO contract 恢复请求/响应/映射同源，避免仅在 handler 或 test 中临时补类型。
 - [x] 已完成改动面收口：新增 `server/services/production_dto.go`，恢复 `production_service.go` 的请求/返回类型与 model 映射，并让 `production_topology_handlers.go` / `production_service_test.go` 重新接回统一 DTO 定义。
 - [x] 已同步核对 JSON 字段、`segments/processes` 嵌套映射、`version` 与 `authCode` 语义，避免恢复后继续出现运行时错绑或落库丢字段。
 - [x] 已完成最小验证：`go test ./services -run Production` 通过；`go test ./handlers -run Production` 当前被无关既有断链 `handlers/save_patch_semantics_test.go:162 undefined: services.SalesOrderDTO` 阻塞。
 - [x] 已在 `walkthrough.md` 记录本次断链点、恢复方案与验证边界。

- [x] 147. 根因修复：收口 `save_patch_semantics_test.go` 对旧 `services.SalesOrderDTO` 契约依赖（已完成）
  - [x] 已复核 `server/handlers/save_patch_semantics_test.go`、`server/handlers/sales_orders.go`、相关 `models.SalesOrder` 字段与批量同步保存路径，确认当前真实 contract 已是 `saveSalesOrderForBulkSync(tx, *models.SalesOrder)`，而非 `*services.SalesOrderDTO`。
  - [x] 已确认断链根因：当前失败并非业务主链缺失 `SalesOrderDTO`，而是测试仍停留在旧 DTO 输入模型；未通过补一个 `services.SalesOrderDTO` 制造新的伪契约。
  - [x] 已按根因修复方向让测试与真实保存语义重新对齐，围绕 `models.SalesOrder` 的 PATCH/稀疏更新语义验证未提交字段保留逻辑。
  - [x] 改动面已限定在 `server/handlers/save_patch_semantics_test.go`，未扩展为销售订单领域接口重构。
  - [x] 已核对并保留关键断言：`requirements`、`workflow_instance_id` 在 sparse update 场景下继续保留既有值。
  - [x] 已完成验证：`go test ./handlers -run SavePatchSemantics` 通过，`services.SalesOrderDTO` 这条测试断链已消失。
  - [x] 已在 `walkthrough.md` 记录本次根因修复结果与验证范围。

- [x] 148. `workflow` DTO 改造：收口 definition / instance / task 的 API contract（第一、二轮已完成）
  - [x] 已复核 `server/handlers/workflow.go`、`server/services/workflow_service.go` 与 `models.WorkflowDefinition / WorkflowInstance / WorkflowTask`，确认当前 workflow 模块哪些接口仍直接绑定或直接返回 `models.*`。
  - [x] 已定义 `workflow` 域单一 contract：将外部 API 明确拆为 `Request / Response / Internal Model` 三层，不再让 `handler` 直接把 `models.WorkflowDefinition / WorkflowInstance / WorkflowTask` 当成前后端协议。
  - [x] 已落第一批 Request DTO：`SaveWorkflowDefinitionRequest`、`PatchWorkflowDefinitionRequest`、`CreateWorkflowInstanceRequest`、`WorkflowTaskDecisionRequest`。
  - [x] 已落第一批 Response DTO：`WorkflowDefinitionResponse`、`WorkflowInstanceResponse`、`WorkflowInstanceListItemResponse`、`WorkflowInstanceListResponse`、`WorkflowTaskResponse`。
  - [x] 已新增同域 mapper 并统一放置 `model -> response` 映射，避免 mapper 分散在 handler 内部。
  - [x] 已按第一轮范围收口 `workflow` 主链中的 definition / instance / task 查询与创建接口，未扩展到其它业务域 DTO 重构。
  - [x] 已验证第一轮未误伤 workflow 骨架行为；定向测试 `go test ./services ./handlers ./routes -run "Workflow|Approval|Trading"` 通过，采购/销售建单自动挂 workflow 回归保持正常。
  - [x] 第二轮已完成：审批/驳回任务的返回 contract（`ApproveWorkflowTaskHandler` / `RejectWorkflowTaskHandler`）已收口为 DTO response，并完成对应最小回归验证。

- [x] 149. `workflow` DTO 改造第二轮：收口审批/驳回 response contract（已完成）
  - [x] 已复核 `server/handlers/workflow.go` 中 `ApproveWorkflowTaskHandler` / `RejectWorkflowTaskHandler` 当前仍直接返回 `models.WorkflowInstance` 的调用链，以及 `services.ApproveWorkflowTask` / `RejectWorkflowTask` 的返回边界。
  - [x] 已将第二轮范围限定为“审批/驳回任务 response DTO 收口”，未扩展为 workflow service 事务逻辑重写，也未顺手修改采购/销售业务同步逻辑。
  - [x] 已复用第一轮已有 `WorkflowTaskDecisionRequest` 与 `WorkflowInstanceResponse` / mapper，未新增重复 contract。
  - [x] 已保持审批/驳回错误语义不变：`task not found`、`assignee mismatch`、`already handled`、默认 500 分支的状态码与中文错误提示未漂移。
  - [x] 已完成验证：`go test ./services ./handlers ./routes -run "Workflow|Approval|Trading"` 通过，审批通过、审批拒绝、审批人不匹配、重复处理与采购/销售 workflow 回归链路未被破坏。
  - [x] 已在 `walkthrough.md` 记录第二轮改造结果与验证范围。

- [x] 150. `sales_orders / trading` DTO 收口：稳定订单域 API contract 与 PATCH 语义（销售订单第一轮已完成）
  - [x] 已复核 `server/handlers/sales_orders.go`、相关 trading/workflow 测试与 `models.SalesOrder` 边界，确认当前高风险点集中在销售订单主链的 request/response contract 与 sparse update 语义。
  - [x] 已为销售订单主链建立订单域 contract：拆出 `Create/Save Request`、`Patch/Sync Request`、`Response`，不再让相关 handler 默认把 `models.SalesOrder` 当成对外协议。
  - [x] 已按第一轮范围优先收口销售订单主链：覆盖保存、批量同步、列表/详情响应，以及与 `workflow_instance_id` 相关的对外返回字段边界；本轮未同时大改采购单链路。
  - [x] 已保持 PATCH / 稀疏更新边界：`saveSalesOrderForBulkSync(...)` 的 `requirements`、`workflow_instance_id` 未提交字段保留逻辑未被破坏。
  - [x] 已保持与 workflow 的边界：销售订单新建自动挂 workflow 实例的既有行为保持不变，trading workflow 相关回归未失真。
  - [x] 已完成列表/详情 contract 收口：列表使用 `SalesOrderListResponse/ListItemResponse`，详情/保存返回使用 `SalesOrderResponse`。
  - [x] 已完成验证：`go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading"` 通过。
  - [ ] 后续待扩：采购单主链 DTO 收口与其它 trading 子域 contract 收口，后续另行规划确认。

- [x] 151. `purchase_orders` DTO 收口：稳定采购单主链 API contract 与 PATCH 语义（第一轮已完成）
  - [x] 已复核 `server/handlers/purchase_orders.go`、相关 trading/workflow 测试与 `models.PurchaseOrder` 边界，确认当前高风险点集中在采购单主链的 request/response contract。
  - [x] 已为采购单主链建立单一 contract：拆出 `Create/Save Request` 与 `Response`，不再让相关 handler 默认把 `models.PurchaseOrder` 当成对外协议。
  - [x] 已按第一轮范围收口采购订单主链：覆盖保存、列表/详情响应，以及与 `workflow_instance_id` 相关的对外字段边界；本轮未扩展到整个 trading 其它子域。
  - [x] 已保持与 workflow 的边界：采购单新建自动挂 workflow 实例的既有行为未被破坏，相关 workflow E2E 回归继续成立。
  - [x] 已完成列表/详情 contract 收口：列表使用 `PurchaseOrderListResponse/ListItemResponse`，详情/保存返回使用 `PurchaseOrderResponse`。
  - [x] 已完成验证：`go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading"` 通过。
  - [ ] 后续待扩：采购单 patch/sync 进一步细化，以及收货/库存/凭证相关子链路 contract 收口，后续另行规划确认。

- [x] 152. `purchase_orders` DTO 改造第二轮：收口收货确认与下游返回 contract（已完成）
  - [x] 已复核 `server/handlers/purchase_orders.go` 中 `ConfirmPurchaseReceiptHandler` 当前返回的 `purchaseOrder` / `createdInboundRecords` 混合结构，确认成功返回仍直接暴露 `models.*`。
  - [x] 已将第二轮范围限定为“采购收货确认返回 contract 收口”，统一让采购单返回延续第一轮的 `PurchaseOrderResponse`，并为收货结果设计最小必要 response 结构；未扩展为库存/凭证全链 DTO 化。
  - [x] 已复用第一轮已有采购单 DTO / mapper，未重复发明第二套采购单 response；并仅为 `createdInboundRecords` 补最小必要 result DTO。
  - [x] 已保持既有业务语义不变：收货确认成功后的采购单状态更新、入库记录创建、错误状态码与中文错误消息未漂移。
  - [x] 已完成验证：`go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading|Receipt|Inbound"` 通过，采购收货确认、采购状态重算、入库联动与 workflow 回归未被破坏。
  - [x] 已在 `walkthrough.md` 记录第二轮改造结果与验证范围。

- [x] 153. `production` 子链路 DTO 收口：稳定 production topology 主链 contract（已完成）
  - [x] 已复核 `server/handlers/production_topology_handlers.go`、`server/services/production_service.go`、`server/services/production_dto.go` 与相关测试，确认当前 production topology 主链已具备 DTO 雏形，主要剩余问题是 handler 入口仍使用匿名请求体。
  - [x] 已将本轮范围限定为 production topology 主链最小闭环：优先加固 `SaveProductionLineHandler` 的 request contract 边界，未顺手扩展到整个 production 其它子链路。
  - [x] 已识别并复用既有 `ProductionLineDTO`、`SaveProductionLineRequest` 与 mapper，未重复发明 production DTO；仅补充正式的 handler request DTO。
  - [x] 已保持既有业务语义不变：授权码校验、版本冲突处理、拓扑保存事务与错误状态码未漂移。
  - [x] 已补充最小 request contract 绑定测试，固定 `ProductionLineDTO + authCode` 的入口结构。
  - [x] 已完成验证：`go test ./services ./handlers -run "Production|Topology"` 通过，版本冲突、授权码与 production topology 主链回归未被破坏。
  - [x] 已在 `walkthrough.md` 记录本轮 DTO 边界加固结果与验证范围。

- [x] 154. `production` 其它子链路 DTO 收口：按子模块分阶段稳定 contract（第一阶段已完成）
  - [x] 已复核 `production topology` 之外的 production 入口与 service，确认当前第一优先级应落在 `ProcessStep` / `StationProcessMapping`，因为这部分仍直接收发 `models.ProcessStep`、匿名请求体或原始 map。
  - [x] 已按“子链路分阶段治理”执行第一阶段，而非整域一次性重构；本轮仅收口 `ProcessStep + StationProcessMapping` 最小闭环。
  - [x] 已完成第一优先级入口收口：`ProcessStep` / `StationProcessMapping` 相关入口已建立稳定 request/response contract。
  - [ ] 第二优先级待后续：production 查询/报表类接口（如进度、看板、日历、汇总），重点排查空数组/null、匿名 response、跨层混用结构。
  - [x] 已保持既有业务语义不变：工序保存、工位绑定、删除与映射查询错误语义及状态码未漂移。
  - [x] 已控制范围：未把 DTO 收口扩展为 production 域全面重构。
  - [x] 已完成验证：`go test ./services ./handlers -run "Production|Process|Station"` 通过，并补充最小 handler/service contract 测试固定入口结构。
  - [x] 已在 `walkthrough.md` 记录本阶段 DTO 收口结果与验证范围。

- [x] 155. `production` 查询/报表类 contract 收口：稳定 progress/report/dashboard/calendar response（第一阶段已完成）
  - [x] 已复核 production 查询/报表相关 handlers/services，确认第一批高风险入口集中在 `server/handlers/production_plans.go` 的 plans/stats/order-progress 查询链。
  - [x] 已将本轮范围限定为“查询/报表类 response contract 收口”，优先稳定只读接口输出结构；未扩展为执行/排产链路重构，也未改写核心统计逻辑。
  - [x] 已完成第一优先级入口收口：`GetProductionPlansHandler`、`GetProductionStatsHandler`、`GetOrderProgressHandler` 已切到正式命名 response type，并保持空数据稳定语义。
  - [ ] 第二优先级待后续：其它 production report / dashboard / calendar 聚合接口，继续排查匿名 response、直出内部 model 与字段集漂移风险。
  - [x] 已保持既有业务语义不变：查询过滤条件、错误状态码、无数据返回语义、聚合逻辑与前端已依赖字段名未漂移。
  - [x] 已控制风险：未把查询/报表类收口扩展为整个 dashboard/report 体系重构。
  - [x] 已完成验证：`go test ./handlers ./services -run "Production|Progress|Report|Calendar|Dashboard"` 通过，response shape 与空数据语义未回归。
  - [x] 已在 `walkthrough.md` 记录第一阶段 contract 收口结果与验证范围。

- [x] 156. `production` 查询/报表类 contract 收口第二阶段：report / dashboard / calendar 其它聚合接口（调查完成，当前无新增后端落点）
  - [x] 已复核第一阶段未覆盖的 production 聚合查询接口，重点检查 `server/routes/routes_production.go` 与 `server/handlers`，确认当前 `/production` 路由组下仅剩 `plans/stats/order-progress` 三个只读聚合接口，且已在第一阶段收口完成。
  - [x] 已将第二阶段范围限定为“剩余聚合只读接口 response contract 收口”，并确认当前后端代码中不存在新的 `/production` 域 `report / dashboard / calendar` 聚合只读接口可继续改造。
  - [x] 已复用第一阶段已有 production query contract 结论，无需新增 response type，也不应为凑阶段而误扩到非 production 域接口。
  - [x] 已保持边界清晰：未扩展为写接口、执行链路或其它域（equipment / audit / experimental）接口改造。
  - [x] 已完成调查验证：当前 `/production` 路由落点已无剩余第二阶段后端聚合接口；因此本阶段不新增业务代码修改。
  - [x] 已在 `walkthrough.md` 记录调查结论与当前范围边界。

- [x] 157. A 级 DTO 总推进：主交易 / workflow / inventory / production / finance 核心边界分阶段收口（inventory 第一阶段已完成）
  - [x] 已将本轮定义为“**A 级总推进计划**”，执行按阶段推进，不并行摊开所有模块。
  - [x] 已确认 A 级范围包含：
    - `workflow`
    - `sales_orders`
    - `purchase_orders`
    - `inventory` 命令链
    - `production` 主配置链
    - `production` 核心查询链
    - `voucher / finance` 核心读接口
  - [x] 已确认已完成或已建立主边界的模块（workflow / sales_orders / purchase_orders / production 主配置链 / production 核心查询链）当前以**守边界、防回退、补缺口**为主，不重复大改。
  - [x] 已完成本轮优先新实现阶段之一：`inventory` 命令链 DTO 第一轮收口。
  - [x] 已完成 `inventory` 命令链第一轮的高风险 command 收口：入库/出库/提交/作废等 request/response contract 已从 `models.*` 上剥离，状态机错误语义、并发/冲突语义与订单/成本/凭证联动边界未被破坏。
  - [x] 已完成本轮优先新实现阶段之二：`voucher / finance` 核心读接口 DTO 加固（list/detail/filter/includeEntries/空数组语义）。
  - [x] 已保持既有业务语义不变：A 级模块当前已稳定的 workflow 挂接、patch 保护、状态流转、空数组语义、错误状态码与中文错误消息未漂移。
  - [x] 已完成阶段验证：
    - `go test ./handlers ./services ./routes -run "Inventory|Inbound|Shipment|Commit|Void|PurchaseOrder|SalesOrder"`
    - `go test ./handlers ./routes -run "Voucher|Finance"`
  - [x] 已在 `walkthrough.md` 记录 inventory 第一阶段与 voucher / finance 核心读接口 DTO 加固结果。
