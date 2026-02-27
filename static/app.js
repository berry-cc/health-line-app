// static/app.js  (VHDS V3 完整版)
(function () {

const $ = (id)=>document.getElementById(id);

const el = {

age:$("age"),
height:$("height"),
weight:$("weight"),
waist:$("waist"),
mode:$("mode"),
photos:$("photos"),
preview:$("photoPreview"),

analyze:$("analyze"),
reset:$("reset"),
alert:$("alert"),

summary:$("summary"),

vhdsScore:$("vhdsScore"),
vhdsLabel:$("vhdsLabel"),
needle:$("needle"),

trend:$("trend"),
confidence:$("confidence"),

todayState:$("todayState"),
bioAge:$("bioAge"),

potentialFill:$("potentialFill"),
potentialPct:$("potentialPct"),
window:$("window"),

priorityAction:$("priorityAction"),
expectedLift:$("expectedLift"),

top3:$("top3"),

execSummary:$("execSummary"),
metrics:$("metrics")

};

let currentResult=null;

////////////////////////////////////////////////////////////
// alert
////////////////////////////////////////////////////////////

function showAlert(msg){

el.alert.textContent=msg;
el.alert.classList.remove("hidden");

}

function hideAlert(){

el.alert.classList.add("hidden");

}

////////////////////////////////////////////////////////////
// preview
////////////////////////////////////////////////////////////

function renderPreview(photos){

el.preview.innerHTML="";

photos.forEach(p=>{

const img=document.createElement("img");

img.className="thumb";
img.src=p.dataUrl;

el.preview.appendChild(img);

});

}

////////////////////////////////////////////////////////////
// gauge
////////////////////////////////////////////////////////////

function setGauge(score){

el.vhdsScore.textContent=score;

const deg=-90+(score/100)*180;

el.needle.style.transform=
`translateX(-50%) rotate(${deg}deg)`;

}

////////////////////////////////////////////////////////////
// radar
////////////////////////////////////////////////////////////

function renderRadar(result){

if(window.VHDSRadar){

VHDSRadar.start("radar",result.metrics);

}

}

////////////////////////////////////////////////////////////
// metrics
////////////////////////////////////////////////////////////

function renderMetrics(metrics){

el.metrics.innerHTML="";

metrics.forEach(m=>{

const div=document.createElement("div");

div.className="metric";

div.innerHTML=`

<div class="metricHead">

<div class="metricName">${m.name}</div>

<div class="metricScore">${m.score}</div>

</div>

<div class="metricDesc">${m.description}</div>

`;

el.metrics.appendChild(div);

});

}

////////////////////////////////////////////////////////////
// top3
////////////////////////////////////////////////////////////

function renderTop3(list){

el.top3.innerHTML="";

list.forEach(item=>{

const div=document.createElement("div");

div.className="topcard";

div.innerHTML=`

<div class="badge">${item.rank}</div>

<div class="icon">${item.icon}</div>

<div class="topinfo">

<div class="topname">${item.name}</div>

<div class="topscore">${item.concernScore}</div>

<div class="topmeta">${item.reason}</div>

<div class="toplift">+${item.expectedLiftPct}%</div>

</div>

`;

el.top3.appendChild(div);

});

}

////////////////////////////////////////////////////////////
// summary
////////////////////////////////////////////////////////////

function renderSummary(result){

currentResult=result;

el.summary.classList.remove("hidden");

setGauge(result.idx);

el.vhdsLabel.textContent=result.label;

el.trend.textContent=result.trend;

el.confidence.textContent=result.confidence+"%";

el.todayState.textContent=result.todayState;

el.bioAge.textContent=result.bioAge;

el.potentialFill.style.width=result.potential+"%";

el.potentialPct.textContent=result.potential+"%";

el.window.textContent=result.windowDays+" days";

el.priorityAction.textContent=result.priorityAction;

el.expectedLift.textContent="+"+result.expectedLift+"%";

renderTop3(result.top3Cards);

renderRadar(result);

renderMetrics(result.metrics);

el.execSummary.textContent=result.execSummary;

}

////////////////////////////////////////////////////////////
// analyze
////////////////////////////////////////////////////////////

async function doAnalyze(){

hideAlert();

const state=VHDSState.get();

if(!state.photos.length){

showAlert("請先上傳照片");

return;

}

const face=await VHDSFaceValidation.validatePhotos(state.photos);

if(!face.ok){

showAlert("照片不是有效人像");

return;

}

const result=VHDSEngine.analyze({

mode:state.mode,
inputs:state.inputs,
photos:state.photos,
confidence:face.confidence

});

VHDSState.setLastResult(result);

renderSummary(result);

}

////////////////////////////////////////////////////////////
// bind
////////////////////////////////////////////////////////////

function bind(){

el.photos.addEventListener("change",async e=>{

const files=[...e.target.files];

const photos=[];

for(const f of files){

const reader=new FileReader();

await new Promise(res=>{

reader.onload=()=>{

photos.push({

dataUrl:reader.result

});

res();

};

reader.readAsDataURL(f);

});

}

VHDSState.setPhotos(photos);

renderPreview(photos);

});

el.mode.addEventListener("change",()=>{

VHDSState.setMode(el.mode.value);

});

el.analyze.addEventListener("click",doAnalyze);

}

////////////////////////////////////////////////////////////
// init
////////////////////////////////////////////////////////////

function init(){

bind();

const state=VHDSState.get();

renderPreview(state.photos);

}

init();

})();
