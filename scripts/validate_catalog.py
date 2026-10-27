import json
from pathlib import Path

catalog=json.loads(Path('content/catalog.json').read_text())
expected={'poems':('P',40),'songs':('M',40),'grammar':('G',40)}
all_ids=[]
for name,(prefix,count) in expected.items():
 items=catalog[name]
 assert len(items)==count, f'{name}: expected {count}, got {len(items)}'
 ids=[item['id'] for item in items]
 assert ids==[f'{prefix}{n:03}' for n in range(1,count+1)], f'{name}: missing or out-of-order IDs'
 all_ids.extend(ids)
 required={'poems':['title','author','period','work','source','rights','theme','difficulty','vocabulary','semanticNuance','phonetics','stylistics','grammar','interpretationExercise','oralExercise','comprehensionCriterion'], 'songs':['title','performer','composerLyricist','year','genre','source','listenSearch','theme','difficulty','vocabulary','metaphors','idioms','pronunciation','liaisonsElisions','grammar','listeningExercise','singingExercise','comprehensionCriterion'], 'grammar':['title','level','explanation','example','exercise','answer','why','criterion']}[name]
 for item in items:
  for field in required:
   assert str(item.get(field,'')).strip(), f'{item["id"]}: empty {field}'
assert len(all_ids)==len(set(all_ids))==120
assert Path('content/CATALOGO_FRANCES.md').is_file()
assert 'L’existentialisme est un humanisme' in Path('content/CATALOGO_FRANCES.md').read_text()
print('PASS: 40 poems, 40 songs, 40 grammar units; 120 unique IDs; required fields populated.')
