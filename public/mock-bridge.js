!function(){
  function isRunningInElectron(){
    if(typeof window!=='undefined'&&window.__IS_ELECTRON__)return true;
    if(typeof window!=='undefined'&&window.electronAPI)return true;
    if(typeof navigator!=='undefined'&&navigator.userAgent&&navigator.userAgent.toLowerCase().indexOf('electron')>-1)return true;
    if(typeof process!=='undefined'&&process.versions&&process.versions.electron)return true;
    return false;
  }
  if(isRunningInElectron()){window.__MOCK_SKIPPED__=true;return;}

function getProductInfo(code){const T=[{code:'FROZEN_MEAT',name:'冷冻肉类',standardTemp:-18,threshold:-12},{code:'FROZEN_SEAFOOD',name:'冷冻水产',standardTemp:-20,threshold:-15},{code:'CHILLED_VEGETABLE',name:'冷藏蔬菜',standardTemp:4,threshold:8},{code:'CHILLED_FRUIT',name:'冷藏水果',standardTemp:5,threshold:10},{code:'DAIRY',name:'乳制品',standardTemp:4,threshold:7},{code:'VACCINE',name:'疫苗/医药',standardTemp:2,threshold:5},{code:'ICE_CREAM',name:'冰淇淋',standardTemp:-22,threshold:-18},{code:'PREPARED_FOOD',name:'速冻食品',standardTemp:-18,threshold:-12}];return T.find(p=>p.code===code)||T[0];}
function randomInt(m,n){return Math.floor(Math.random()*(n-m+1))+m;}
function randomFloat(m,n,d){d=d||1;return parseFloat((Math.random()*(n-m)+m).toFixed(d));}
function randomChoice(a){return a[Math.floor(Math.random()*a.length)];}
function calcRiskScore(maxTemp,threshold,tempTrend,pt){let s=0;const d=maxTemp-threshold;if(d>5)s+=50;else if(d>3)s+=35;else if(d>0)s+=20;else if(d>-2)s+=5;if(tempTrend==='rising_fast')s+=35;else if(tempTrend==='rising')s+=20;else if(tempTrend==='stable')s+=5;else s-=5;if(pt==='VACCINE')s+=15;else if(pt==='ICE_CREAM')s+=10;else if(pt==='FROZEN_SEAFOOD')s+=8;return Math.max(0,Math.min(100,s));}
function getRiskLevel(s){return s>=60?'critical':s>=35?'warning':s>=15?'attention':'normal';}
function getTrendLabel(t){return({rising_fast:'快速上升',rising:'缓慢上升',stable:'温度稳定',falling:'温度下降'})[t]||'未知';}

function generateMockVehicles(){
  const PT=[{code:'FROZEN_MEAT',name:'冷冻肉类',standardTemp:-18,threshold:-12},{code:'FROZEN_SEAFOOD',name:'冷冻水产',standardTemp:-20,threshold:-15},{code:'CHILLED_VEGETABLE',name:'冷藏蔬菜',standardTemp:4,threshold:8},{code:'CHILLED_FRUIT',name:'冷藏水果',standardTemp:5,threshold:10},{code:'DAIRY',name:'乳制品',standardTemp:4,threshold:7},{code:'VACCINE',name:'疫苗/医药',standardTemp:2,threshold:5},{code:'ICE_CREAM',name:'冰淇淋',standardTemp:-22,threshold:-18},{code:'PREPARED_FOOD',name:'速冻食品',standardTemp:-18,threshold:-12}];
  const PN=['京A·88F21','沪B·66K98','粤C·12H45','浙D·33L67','苏E·99M12','鲁F·55N88','川G·77P23','鄂H·44Q56','闽J·22R34','赣K·88S76','皖L·11T09','湘M·66U43','豫N·33V21','冀O·99W87','晋P·55X65'];
  const DR=['张建国','李卫东','王志强','刘建军','陈明辉','赵德昌','孙立平','周永兴','吴文德','郑海涛'];
  const SU=['中粮冷链物流','双汇食品运输','伊利集团物流','三全食品配送','蒙牛冷链运输','安井食品物流','正大集团配送','雨润食品运输','思念食品物流','圣迪乐冷链'];
  const vs=[];
  for(let i=0;i<12;i++){
    const p=randomChoice(PT);const tc=randomChoice(['rising_fast','rising','stable','falling']);
    let mt;if(tc==='rising_fast')mt=randomFloat(p.threshold+1,p.threshold+8);
    else if(tc==='rising')mt=randomFloat(p.threshold-2,p.threshold+4);
    else if(tc==='stable')mt=randomFloat(p.standardTemp-3,p.standardTemp+2);
    else mt=randomFloat(p.standardTemp-5,p.standardTemp-1);
    const etaMin=randomInt(2,45);const now=new Date();const eta=new Date(now.getTime()+etaMin*60000);
    const rs=calcRiskScore(mt,p.threshold,tc,p.code);const rl=getRiskLevel(rs);
    const st=etaMin<=5?'approaching':etaMin<=15?'waiting':'en_route';
    vs.push({id:'VH'+String(1001+i),plateNumber:PN[i%PN.length],driver:randomChoice(DR),supplier:randomChoice(SU),productType:p.code,productName:p.name,standardTemp:p.standardTemp,thresholdTemp:p.threshold,maxTemp:mt,tempTrend:tc,trendLabel:getTrendLabel(tc),riskScore:rs,riskLevel:rl,eta:eta,etaMinutes:etaMin,status:st,weight:randomFloat(5,28),pallets:randomInt(12,48),trailerType:randomChoice(['冷藏半挂','冷藏厢式','冷藏集装箱']),phone:'1'+randomInt(3,9)+String(randomInt(100000000,999999999)),assignedDock:rl==='critical'?randomInt(1,4):null,orderNo:'DD'+Date.now()+String(i).padStart(3,'0')});
  }
  return vs.sort((a,b)=>b.riskScore-a.riskScore);
}

function generateTemperatureHistory(maxTemp,tempTrend,productType){
  const p=getProductInfo(productType);const h=[];const now=new Date();const base=p.standardTemp;const N=30;
  for(let i=N-1;i>=0;i--){const t=new Date(now.getTime()-i*60000);const pr=(N-i)/N;let temp;
    switch(tempTrend){case'rising_fast':temp=base+(maxTemp-base)*Math.pow(pr,0.7)+randomFloat(-0.5,0.5);break;
    case'rising':temp=base+(maxTemp-base)*pr+randomFloat(-0.3,0.3);break;
    case'stable':temp=maxTemp+randomFloat(-0.8,0.8);break;
    case'falling':temp=maxTemp-(maxTemp-base)*pr+randomFloat(-0.3,0.3);break;
    default:temp=base+randomFloat(-1,1);}
    h.push({time:String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0'),temp:parseFloat(temp.toFixed(1)),threshold:p.threshold,standard:p.standardTemp});}
  return h;
}

const mockState={vehicles:generateMockVehicles(),records:[],detailVehicleId:null,recordVehicleId:null};
const detailListeners=[];const recordInitListeners=[];

const mockAPI={
  vehicles:{
    getAll:async()=>JSON.parse(JSON.stringify(mockState.vehicles)),
    getById:async(id)=>{const v=mockState.vehicles.find(x=>x.id===id);if(v){return Object.assign(JSON.parse(JSON.stringify(v)),{temperatureHistory:generateTemperatureHistory(v.maxTemp,v.tempTrend,v.productType)});}return null;},
    sortByRisk:async()=>{mockState.vehicles.sort((a,b)=>b.riskScore-a.riskScore);return JSON.parse(JSON.stringify(mockState.vehicles));},
    updateStatus:async(id,status)=>{const v=mockState.vehicles.find(x=>x.id===id);if(v){v.status=status;return JSON.parse(JSON.stringify(v));}return null;},
    onUpdated:(cb)=>{setInterval(()=>{mockState.vehicles=mockState.vehicles.map(v=>{if(v.etaMinutes>0)return Object.assign({},v,{etaMinutes:v.etaMinutes-1,eta:new Date(Date.now()+(v.etaMinutes-1)*60000)});return v;});cb(JSON.parse(JSON.stringify(mockState.vehicles)));},60000);},
    onSelected:(cb)=>{detailListeners.push(cb);if(mockState.detailVehicleId)cb(mockState.detailVehicleId);},
    onVehicleUpdated:()=>{}
  },
  records:{
    create:async(rec)=>{const r=Object.assign({id:'REC'+Date.now(),createdAt:new Date().toISOString()},rec);mockState.records.unshift(r);return r;},
    getAll:async()=>JSON.parse(JSON.stringify(mockState.records)),
    onInit:(cb)=>{recordInitListeners.push(cb);if(mockState.recordVehicleId)cb(mockState.recordVehicleId);},
    onCreated:()=>{}
  },
  window:{
    openDetail:(id)=>{mockState.detailVehicleId=id;const w=window.open('detail.html','车辆详情','width=960,height=720');if(w){w.mockVehicleId=id;setTimeout(()=>{detailListeners.forEach(cb=>cb(id));},300);}detailListeners.forEach(cb=>cb(id));},
    openRecord:(id)=>{mockState.recordVehicleId=id;const w=window.open('record.html','收货记录','width=720,height=800');if(w){w.mockVehicleId=id;setTimeout(()=>{recordInitListeners.forEach(cb=>cb(id));},300);}recordInitListeners.forEach(cb=>cb(id));},
    closeDetail:()=>{try{window.close();}catch(e){}},
    closeRecord:()=>{try{window.close();}catch(e){}}
  }
};
window.electronAPI=mockAPI;window.mockAPI=mockAPI;window.mockState=mockState;
}();
