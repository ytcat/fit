/* Localization for the standalone roam UI; never writes game settings or save data. */
(function(root){
 'use strict';
 const LANGS=['en','he','ru'], PREF='shadowbox-language';
 const C={
  en:{
   title:'Glory of the Ring · Chapter 1 Free Roam', chapter:'GLORY OF THE RING · CHAPTER 1', stage:'Glory of the Ring · Free roam view',
   zone:'Free roam', help:'Explore freely without changing story progress or saves',
   waypoint:'Free-roam navigation', destination:'Walking destination', none:'No destination',
   bruno:'Bruno’s Gym', market:'Fruit stall in the market', otto:'Otto’s Shop', docks:'Dockside Quay',
   stick:'Movement joystick. On a keyboard, use arrow keys or WASD.', zoom:'Camera zoom', plus:'Zoom in', minus:'Zoom out',
   story:'Return to the story mission', loading:'Loading the street…', noRoute:'No route to the destination',
   arrived:'You’ve reached your destination', distance:'About {n} m', gate:'Go to {name}',
   loadError:'Couldn’t load this area. You can try again.',
   contextLost:'Your browser stopped the 3D view. Refresh to continue.',
   unavailable:'Free roam is unavailable on this device (WebGL or game assets).',
   districts:{oldtown:'Old Town', market:'Market Row', otto:'Otto’s Shop', docks:'Dockside Quay'}
  },
  he:{
   title:'תהילת הזירה · הליכה חופשית בפרק 1', chapter:'תהילת הזירה · פרק 1', stage:'תהילת הזירה · תצוגת הליכה חופשית',
   zone:'הליכה חופשית', help:'מצב חופשי · בלי לשנות שמירות או לקדם משימות',
   waypoint:'ניווט חופשי', destination:'יעד להליכה', none:'ללא יעד',
   bruno:'חדר הכושר של ברונו', market:'דוכן הפירות בשוק', otto:'החנות של אוטו', docks:'רציף הנמל',
   stick:'ג׳ויסטיק תנועה. במקלדת השתמשו במקשי החצים או ב־WASD.', zoom:'זום מצלמה', plus:'זום פנימה', minus:'זום החוצה',
   story:'חזרה למשימת הסיפור', loading:'טוען את הרחוב…', noRoute:'אין מסלול ליעד',
   arrived:'הגעת ליעד', distance:'כ־{n} מ׳', gate:'מעבר אל {name}',
   loadError:'לא הצלחנו לטעון את האזור. אפשר לנסות שוב.',
   contextLost:'הדפדפן עצר את התצוגה. יש לרענן כדי להמשיך.',
   unavailable:'תצוגת ההליכה החופשית אינה זמינה במכשיר הזה (WebGL או נתוני המשחק).',
   districts:{oldtown:'העיר העתיקה',market:'שדרת השוק',otto:'החנות של אוטו',docks:'רציף הנמל'}
  },
  ru:{
   title:'Glory of the Ring · Свободная прогулка в главе 1', chapter:'GLORY OF THE RING · ГЛАВА 1', stage:'Glory of the Ring · Обзор свободной прогулки',
   zone:'Свободная прогулка', help:'Исследуйте город без изменения сохранений и сюжета',
   waypoint:'Навигация в свободном режиме', destination:'Цель прогулки', none:'Без цели',
   bruno:'Зал Бруно', market:'Фруктовая лавка на рынке', otto:'Магазин Отто', docks:'Портовый причал',
   stick:'Джойстик движения. На клавиатуре используйте стрелки или WASD.', zoom:'Масштаб камеры', plus:'Приблизить', minus:'Отдалить',
   story:'Вернуться к сюжетному заданию', loading:'Загрузка улицы…', noRoute:'Нет маршрута к цели',
   arrived:'Вы на месте', distance:'Около {n} м', gate:'Перейти: {name}',
   loadError:'Не удалось загрузить район. Попробуйте ещё раз.',
   contextLost:'Браузер отключил 3D-вид. Обновите страницу, чтобы продолжить.',
   unavailable:'Свободная прогулка недоступна на этом устройстве (WebGL или игровые файлы).',
   districts:{oldtown:'Старый город',market:'Рыночная улица',otto:'Магазин Отто',docks:'Портовый причал'}
  }
 };
 function normalize(value){
  if(typeof value!=='string')return null;
  const primary=value.trim().toLowerCase().match(/^([a-z]{2})(?:[-_][a-z0-9]{2,8})*$/)?.[1];
  if(primary==='iw')return 'he';
  return LANGS.includes(primary)?primary:null;
 }
 function resolve(search,readPreference,languages){
  const query=normalize(new URLSearchParams(search).get('lang'));if(query)return query;
  try{const stored=normalize(readPreference?.(PREF));if(stored)return stored;}catch{}
  for(const l of languages||[]){const normalized=normalize(l);if(normalized)return normalized;}
  return 'en';
 }
 function locale(lang){
  lang=normalize(lang)||'en';const words=C[lang], number=new Intl.NumberFormat(lang,{useGrouping:false});
  return {lang,dir:lang==='he'?'rtl':'ltr',words,
   distance:metres=>words.distance.replace('{n}',number.format(Math.max(1,Math.round(metres)))),
   gate:zone=>words.gate.replace('{name}',words.districts[zone]||''),
   returnURL:'./index.html?'+new URLSearchParams({lang})+'#chapter1-story'};
 }
 function apply(doc,l){
  doc.documentElement.lang=l.lang;doc.documentElement.dir=l.dir;doc.title=l.words.title;
  for(const el of doc.querySelectorAll('[data-roam-text]'))el.textContent=l.words[el.dataset.roamText];
  for(const el of doc.querySelectorAll('[data-roam-label]'))el.setAttribute('aria-label',l.words[el.dataset.roamLabel]);
  doc.getElementById('story-return').href=l.returnURL;
 }
 const api={normalize,resolve,locale,apply};
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{const lang=resolve(root.location.search,key=>root.localStorage.getItem(key),root.navigator.languages?.length?root.navigator.languages:[root.navigator.language]);root.Chapter1RoamLocale=locale(lang);apply(root.document,root.Chapter1RoamLocale);}
})(globalThis);
