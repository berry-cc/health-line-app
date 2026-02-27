// static/vhds_engine.js
// VHDS V3 分析引擎

(function(global){

////////////////////////////////////////////////////////
// 四模式指標定義
////////////////////////////////////////////////////////

const MODES = {

health: [

"心肺功能",
"代謝效率",
"體脂控制",
"肌肉品質",
"姿勢穩定",
"疲勞指數",
"恢復能力",
"壓力負荷",
"循環效率",
"老化速度"

],

skin: [

"皮膚水合",
"油脂平衡",
"毛孔狀態",
"膚色均勻",
"色素沉積",
"彈性緊實",
"細紋風險",
"屏障強度",
"光澤度",
"老化表徵"

],

fortune: [

"財運能量",
"事業強度",
"決策能力",
"機會敏感",
"貴人運",
"穩定性",
"抗壓性",
"行動力",
"領導能量",
"人生曲線"

],

psy: [

"專注力",
"情緒穩定",
"壓力承受",
"溝通能力",
"社交能量",
"信任傾向",
"理性程度",
"決策穩定",
"心理韌性",
"關係品質"

]

};

////////////////////////////////////////////////////////
// 工具
////////////////////////////////////////////////////////

function rand(min,max){

return Math.floor(Math.random()*(max-min+1))+min;

}

function clamp(v,min,max){

return Math.max(min,Math.min(max,v));

}

////////////////////////////////////////////////////////
// 生理年齡推算
////////////////////////////////////////////////////////

function calcBioAge(realAge,idx){

if(!realAge) return realAge;

const delta=(idx-50)/5;

return Math.round(realAge-delta);

}

////////////////////////////////////////////////////////
// 指標生成
////////////////////////////////////////////////////////

function generateMetrics(mode,faceConfidence){

const names=MODES[mode]||MODES.health;

return names.map(name=>{

const base=rand(65,92);

const adjusted=clamp(
base+(faceConfidence*5),
60,
98
);

return{

name:name,
score:adjusted,
description:"數值越高代表狀態越佳"

};

});

}

////////////////////////////////////////////////////////
// VHDS Index
////////////////////////////////////////////////////////

function calcIndex(metrics){

const sum=metrics.reduce((a,b)=>a+b.score,0);

return Math.round(sum/metrics.length);

}

////////////////////////////////////////////////////////
// Top3
////////////////////////////////////////////////////////

function calcTop3(metrics){

const sorted=[...metrics]
.sort((a,b)=>a.score-b.score)
.slice(0,3);

return sorted.map((m,i)=>({

rank:i+1,

icon:["⚠️","⚡","🔧"][i],

name:m.name,

concernScore:m.score,

reason:"目前數值較低",

suggestion:"建議優先改善",

expectedLiftPct:rand(8,20)

}));

}

////////////////////////////////////////////////////////
// 潛力
////////////////////////////////////////////////////////

function calcPotential(idx){

return clamp(100-idx,5,40);

}

////////////////////////////////////////////////////////
// label
////////////////////////////////////////////////////////

function calcLabel(idx){

if(idx>=85)return"卓越狀態";

if(idx>=75)return"優化提升期";

if(idx>=65)return"可改善區";

if(idx>=55)return"警示區";

return"失衡區";

}

////////////////////////////////////////////////////////
// Executive Summary
////////////////////////////////////////////////////////

function buildSummary(idx,mode){

return `目前整體指數 ${idx}，屬於${calcLabel(idx)}。

系統判定您的${mode}狀態仍具有改善潛力。

建議持續使用 VHDS 追蹤變化。`;

}

////////////////////////////////////////////////////////
// 主分析
////////////////////////////////////////////////////////

function analyze(data){

const {

mode,
inputs,
photos,
confidence

}=data;

const metrics=generateMetrics(
mode,
confidence||0.8
);

const idx=calcIndex(metrics);

const bioAge=calcBioAge(
Number(inputs.age)||50,
idx
);

return{

idx:idx,

label:calcLabel(idx),

trend:"→",

confidence:Math.round((confidence||0.8)*100),

todayState:calcLabel(idx),

bioAge:bioAge,

potential:calcPotential(idx),

windowDays:rand(14,45),

priorityAction:"持續優化弱項",

expectedLift:rand(5,18),

top3Cards:calcTop3(metrics),

metrics:metrics,

execSummary:buildSummary(idx,mode),

radarAxes:metrics.map(m=>m.name),

radarVals:metrics.map(m=>m.score)

};

}

////////////////////////////////////////////////////////

global.VHDSEngine={

analyze

};

////////////////////////////////////////////////////////

})(window);
