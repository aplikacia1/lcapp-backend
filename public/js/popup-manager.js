console.log("Popup Manager loaded");

window.showOverlay = function(url){

  const old =
    document.getElementById("lbOverlay");

  if(old) old.remove();

  const overlay =
    document.createElement("div");

  overlay.id = "lbOverlay";

  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(0,0,0,.65)";
  overlay.style.zIndex = "999999";

  const frame =
    document.createElement("iframe");

  frame.src = url;

  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.border = "none";
  frame.style.background = "#fff";

  overlay.appendChild(frame);

  document.body.appendChild(overlay);

};

window.closeOverlay = function(){

  const overlay =
    document.getElementById("lbOverlay");

  if(overlay){
    overlay.remove();
  }

};