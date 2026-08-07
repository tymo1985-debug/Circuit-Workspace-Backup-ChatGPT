// Auto-generated module: main.js
import { exportAllData, openBackup } from "./backup.js";
import { createNew, createSeries, openCongressSettings, openNew, openNewSeries, saveCongressSettings } from "./congress.js";
import { collectList, collectProfiles, openList, openProfiles, renderListPreview, saveList, saveProfiles } from "./directories.js";
import { $, $$ } from "./dom.js";
import { init as initI18n, t } from "./i18n.js";
import { allLetters, letterHTML, openLettersMode, printLetter } from "./letters.js";
import { openPrintColumns, planFitReduce, planFitRotate, planFitTwoPages, planFitZoom, printSelectedPlan } from "./plan.js";
import { printWithOrientation } from "./printing.js";
import { render, renderLists, renderSettings, renderTasks } from "./render.js";
import { A, KEY, S, baseSettings, demo, isValidState, load, makeBackup, migrate, newC, save, store } from "./state.js";
import { addTask, checkProgram, drawParts, duplicateCurrent, getParts, saveEdit } from "./tasks.js";
import { openTemplate, resetTemplate, saveTemplate, wrap } from "./template-editor.js";
import { addMin, clean, clone, id, isLetterable, isSection, today, tv } from "./utils.js";

// Переходный визуальный адаптер дизайн-системы. Он меняет только оболочку и
// CSS-классы; обработчики, данные, печатные селекторы и содержимое документов
// остаются прежними. Наблюдатель нужен для строк и диалогов, которые модуль
// строит динамически через innerHTML.
function adoptDesignSystem(root=document){
  let mappings=[
    [".card",["md-card"]],
    [".program-table",["md-table","md-table--sticky","md-table--cards"]],
    [".series-header",["md-sidenav__group"]],
    [".error-box",["md-banner","md-banner--error"]],
    [".issue.warn",["md-banner","md-banner--warn"]],
    [".issue.err",["md-banner","md-banner--error"]],
    [".icon-btn",["md-icon-btn","md-state-layer"]],
    [".icon-text-btn",["md-btn","md-state-layer"]],
  ];
  mappings.forEach(([selector,classes])=>{
    let nodes=[];
    if(root.nodeType===1&&root.matches(selector))nodes.push(root);
    nodes.push(...root.querySelectorAll(selector));
    nodes.forEach(node=>{
      node.classList.add(...classes);
      if(node.matches(".icon-text-btn"))node.classList.add(node.classList.contains("light")?"md-btn-tonal":node.classList.contains("danger")?"md-btn-text":"md-btn-filled");
    });
  });
}

function buildDesignSystemShell(){
  let header=document.querySelector("header.topbar"),tools=document.querySelector(".top-actions"),layout=$("#mainLayout");
  if(!header||!tools||!layout)return;
  document.documentElement.dataset.module="congress-project";
  header.classList.add("md-topbar-v2");
  // nav.js может успеть добавить ссылку «Домой» первым дочерним элементом,
  // поэтому ищем исходный блок заголовка явно, а не по позиции.
  let lead=header.querySelector(":scope > div:not(.top-actions)");
  if(!lead)return;
  lead.classList.add("md-topbar-v2__lead","md-topbar-v2__titles");
  let title=lead.querySelector("h1");
  title.className="md-topbar-v2__title";
  title.dataset.i18n="module.congress-project.title";
  title.textContent="Конгрессы";
  lead.querySelectorAll("p").forEach(node=>node.classList.add("md-topbar-v2__sub"));
  let mark=document.createElement("span");
  mark.className="md-topbar-v2__mark";
  mark.setAttribute("aria-hidden","true");
  mark.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h3M8 17h6"/></svg>';
  lead.insertAdjacentElement("beforebegin",mark);
  let spacer=document.createElement("span");
  spacer.className="md-topbar-v2__spacer";
  header.appendChild(spacer);
  tools.classList.add("md-toolbar","module-tools");
  header.insertAdjacentElement("afterend",tools);
  layout.classList.add("md-shell__body");
  layout.querySelector(".sidebar")?.classList.add("md-sidenav");
  layout.querySelector(".workspace")?.classList.add("md-page");
  layout.querySelectorAll(".head > .actions").forEach(node=>node.classList.add("md-toolbar"));
  adoptDesignSystem(document);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
    if(node.nodeType===1)adoptDesignSystem(node);
  }))).observe(document.body,{childList:true,subtree:true});
}

window.onerror=(m,u,l,c,e)=>{let b=$("#errorBox");if(b){b.textContent="Ошибка JavaScript: "+m+"\nСтрока: "+l+"\n"+(e&&e.stack?e.stack:"");b.classList.remove("hidden")}};
export function clearSelectionIfOutside(e){if(!store.sel)return;if(e.target.closest('dialog,.program-table,.sidebar,button,input,select,textarea,label,.topbar'))return;store.sel=null;renderTasks()}
export function bind(){document.addEventListener('click',clearSelectionIfOutside);$("#newSeriesBtn").onclick=openNewSeries;$("#createSeriesBtn").onclick=createSeries;$("#newCongressBtn").onclick=()=>openNew();$("#createCongressBtn").onclick=createNew;$("#congressSettingsBtn").onclick=openCongressSettings;$("#saveCongressSettingsBtn").onclick=saveCongressSettings;$("#letterSettingsBtn").onclick=()=>{renderSettings();$("#letterSettingsDialog").showModal()};$("#directoryBtn").onclick=()=>openList("groups");$("#speakersBtn").onclick=openProfiles;$("#typesBtn").onclick=()=>openList("types");$("#saveProfilesBtn").onclick=saveProfiles;$("#collectProfilesBtn").onclick=collectProfiles;$("#saveListBtn").onclick=saveList;$("#collectListBtn").onclick=collectList;$("#sortListBtn").onclick=()=>{$("#listEditor").value=clean($("#listEditor").value.split(/\n/)).join("\n");renderListPreview()};$("#clearListBtn").onclick=()=>{if(confirm(t("cong.confirm.clear_list"))){$("#listEditor").value="";renderListPreview()}};$("#backupBtn").onclick=openBackup;$("#downloadBackupBtn").onclick=exportAllData;$("#resetAppBtn").onclick=()=>{if(confirm(t("cong.confirm.reset_all"))){makeBackup(t("cong.msg.before_reset"));localStorage.removeItem(KEY);store.st={congresses:[],activeId:null,settings:baseSettings(),series:[]};newC(t("cong.msg.first_congress"),"SZ Warszawa","2026-11-07",demo());render()}};$("#deleteCongressBtn").onclick=()=>{let c=A();if(c&&confirm(t("cong.confirm.delete_congress",{name:c.name}))){makeBackup("Перед удалением конгресса");store.st.congresses=store.st.congresses.filter(x=>x.id!==c.id);store.st.activeId=store.st.congresses[0]?.id||null;save();render()}};$("#addTaskBtn").onclick=()=>addTask(store.sel,false);$("#addSectionBtn").onclick=()=>addTask(store.sel,true);$("#checkProgramBtn").onclick=checkProgram;$("#lettersModeBtn").onclick=openLettersMode;$("#lettersPrintAllBtn").onclick=allLetters;$("#lettersMarkAllBtn").onclick=()=>{A().tasks.forEach(t=>{if(isLetterable(t)){t.letterSent=true;t.letterSentDate=today();t.status="Письмо отправлено"}});save();renderTasks();openLettersMode()};$("#printPlanBtn").onclick=()=>openPrintColumns();$("#printSelectedPlan").onclick=printSelectedPlan;$("#planFitZoomBtn").onclick=planFitZoom;$("#planFitReduceBtn").onclick=planFitReduce;$("#planFitTwoPagesBtn").onclick=planFitTwoPages;$("#planFitRotateBtn").onclick=planFitRotate;$("#orientationPrintBtn").onclick=()=>{let o=$("#printOrientation").value;$("#orientationDialog").close();printWithOrientation(store.pendingPrintHTML,o,store.pendingPrintFilename)};$("#saveEditBtn").onclick=saveEdit;$("#duplicateTaskBtn").onclick=()=>duplicateCurrent(false);$("#duplicateTaskEmptyBtn").onclick=()=>duplicateCurrent(true);$("#addEditParticipant").onclick=()=>{let p=getParts();p.push({name:"",congregation:""});drawParts(p)};$("#quickTime").onchange=e=>{if(e.target.value)$("#eTime").value=tv(e.target.value)};$("#timeMinus").onclick=()=>$("#eTime").value=addMin($("#eTime").value,-5);$("#timePlus").onclick=()=>$("#eTime").value=addMin($("#eTime").value,5);$("#timeClear").onclick=()=>$("#eTime").value="";$("#printLetterBtn").onclick=printLetter;$("#allLettersBtn").onclick=allLetters;$("#openTemplateBtn").onclick=()=>openTemplate("default");$("#openTypeTemplateBtn").onclick=()=>{if(!$("#templateTypeName").value.trim())return alert(t("cong.alert.type_field_required"));openTemplate("type")};$("#saveTemplateBtn").onclick=saveTemplate;$("#resetTemplateBtn").onclick=resetTemplate;$("#fmtBold").onclick=()=>wrap("**","**");$("#fmtUnderline").onclick=()=>wrap("__","__");$("#fmtItalic").onclick=()=>wrap("*","*");$("#previewTemplateBtn").onclick=()=>{let t=A().tasks.find(x=>!isSection(x))||A().tasks[0];$("#letterPreview").innerHTML=letterHTML(t);$("#letterDialog").showModal()};$("#resetLetterBtn").onclick=()=>{if(confirm(t("cong.confirm.reset_letter"))){store.st.settings=baseSettings();save();renderSettings();renderLists()}};["congressName","congressPlace","congressDate"].forEach(id=>$("#"+id).oninput=e=>{let c=A(),m={congressName:"name",congressPlace:"place",congressDate:"date"};c[m[id]]=e.target.value;save();render()});["letterFont","letterFontSize"].forEach(id=>$("#"+id).oninput=e=>{let m={letterFont:"font",letterFontSize:"fontSize"};S()[m[id]]=e.target.value;save()});$("#letterLanguage").onchange=e=>{self.CWDocLang?.set(e.target.value);renderSettings()};{let m={senderName:"name",senderCode:"code",senderEmail:"email",senderPhone1:"phone1",senderPhone2:"phone2",senderAddress:"address"};Object.keys(m).forEach(id=>$("#"+id).oninput=e=>{self.CWSender?.set({[m[id]]:e.target.value})})}$("#exportBtn").onclick=exportAllData;$("#importInput").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onerror=()=>alert(t("cong.alert.file_unreadable"));r.onload=()=>{let prev=clone(store.st);try{let parsed=JSON.parse(r.result);if(!isValidState(parsed)){alert(t("cong.alert.not_a_backup"));return}makeBackup(t("cong.msg.before_import"));store.st=parsed;migrate();store.st.activeId=store.st.activeId||store.st.congresses[0]?.id;save();render()}catch(err){store.st=prev;alert(t("cong.alert.import_failed",{error:err.message}))}finally{e.target.value=""}};r.readAsText(f)};window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();store.deferredPrompt=e;$("#installBtn").classList.remove("hidden")});$("#installBtn").onclick=()=>{if(store.deferredPrompt){store.deferredPrompt.prompt();store.deferredPrompt=null;$("#installBtn").classList.add("hidden")}};if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));setInterval(save,5*60*1000);window.addEventListener("beforeunload",e=>{if($$("dialog[open]").length){e.preventDefault();e.returnValue=""}});window.addEventListener("afterprint",()=>{if(store.printTitleBackup){document.title=store.printTitleBackup;store.printTitleBackup=null}})}
document.addEventListener("DOMContentLoaded",()=>{try{buildDesignSystemShell();self.CWDocLang?.init({module:"congress-project",langs:["uk","ru","de"],apply:false});bind();initI18n(render);load()}catch(e){let b=$("#errorBox");b.textContent="Ошибка запуска: "+e.message+"\n"+e.stack;b.classList.remove("hidden")}})
