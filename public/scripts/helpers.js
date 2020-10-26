let $ = s => {return document.querySelector(s)};
let $ALL = s => {return document.querySelector(s)};
String.prototype.reverse = function() {return [...this].reverse().join('')}
let GetSortOrder = () => { 
  return (a, b) => {  
    if (a.doc.data().time > b.doc.data().time) return 1;  
    else if (a.doc.data().time < b.doc.data().time) return -1;  
    return 0;  
  }  
}
let last = src => {
	if (src) {
		let lastIndex = src.lastIndexOf('.');
  	return src.substr(0, lastIndex) + '_225x10000' + src.substr(lastIndex);
	} else return;
}
const sleep = m => new Promise(r => setTimeout(r, m))
let doesFileExist = urlToFile => {
    let xhr = new XMLHttpRequest();
    xhr.open('HEAD', urlToFile, false);
    xhr.send();
    if (xhr.status == "404") return false;
    else return true;
}