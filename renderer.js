// This file is required by the index.html file and will
const ipc = require('electron').ipcRenderer
const fs = require("fs")
const path = require("path")
const cheerio = require('cheerio')
const CleanCSS = require('clean-css')
const minify = require('html-minifier').minify

const shell = require('electron').shell
const os = require('os')

// console.log(process.cwd())
let svgList = []

let dropcon = document.querySelector('.file_warpper')

let table = document.querySelector(".file_table_body");

dropcon.addEventListener('dragenter', handleDragover, false);
dropcon.addEventListener('dragover', handleDragover, false);
dropcon.addEventListener('drop', handleDrop, false);

/**
 * [handleDrop 拖拽方法]
 */
function handleDrop(e) {
	e.stopPropagation();
	e.preventDefault();

	let files = e.dataTransfer.files;
	for(let i =0,len = files.length;i<len;i++ ){

	  //文件
	  if(files[i].type == "image/svg+xml" && delSame(files[i].path)){
	    svgList.push({name: files[i].name.replace(".svg",""),path: files[i].path,bool:''})

	  //文件夹
	  }else{

	      //是文件夹进入
	      if(fs.statSync(files[i].path).isDirectory()){
	        readFold(files[i].path,svgList)
	      }
	  }

	}

	
	createHtml()
	// console.log(JSON.stringify(svgList));        
}

/**
 * [handleDrop 创建结构]
 */
var html = "",js = "",pattern = true
function createHtml(succ){

	writeSvg()

	let htmlWp = "";
	svgList.forEach((item) => {
	  let  mess , succMes = ""
	
	  if(item.bool === 0){
	  	mess = "不为整"
	  }else{
	  	mess = ""
	  }
	  if(succ && succ == 1){
	  	succMes = '<svg class="base_right" ><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#base_right" x="0" y="0" ></use></svg>'	  }
	  htmlWp += "<div class='file_table_ls'><span>"+item.name+"</span><span>"+item.path+"</span><span>"+mess+"</span><span>"+succMes+"</span></div>"
	})

	table.innerHTML = "";
	table.insertAdjacentHTML("beforeEnd", htmlWp);
}

/**
 * [handleDrop 剔除重复]
 */
function delSame(url){
	for(let i = svgList.length;i--;){
	  if(svgList[i].path == url){
	    return false
	  }
	}
	return true
}


function handleDragover(e) {
	e.stopPropagation();
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
}


/**
 * [handleDrop 同步流 遍历文件]
 */
function readFold(src,arr){
  let files = fs.readdirSync(src)

    files.forEach(function(filename){
      let  url = path.join(src,filename)

      if(fs.statSync(url).isDirectory()){
        readFold(url ,arr)
      }else{
        if(/\.svg/.test(filename) && delSame(url)){
            arr.push({name: filename.replace(".svg",""),path: url})
        }
      }

    })
}



/**
 * 模式设置
 */

let patternDom = document.querySelector(".exprot_pattern")
let patternChild = document.querySelector(".exprot_pattern").children

patternDom.addEventListener("click",function(e){
	for(let i = patternChild.length;i--;){
		patternChild[i].className = ""
	}
	e.target.className = "on"
	if(e.target.getAttribute("data-pattern") != "1"){
		pattern = false
	}else{
		pattern = true
	}
	// console.log(pattern);
},false)


/**
 * writeSvg  写入svg文件
 */
function writeSvg(){
	html = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">'
	let htmlCompress
	htmlCompress = html

	svgList.forEach((item) =>{
		html += "\n"+separate(fs.readFileSync(item.path,'UTF-8'), item)
		htmlCompress += separate(fs.readFileSync(item.path,'UTF-8'), item)
	})

	html = html+"\n</svg>"
	htmlCompress = htmlCompress+"</svg>"
	htmlCompress = minify(htmlCompress,{collapseWhitespace:true})
	js = "var symbols = '"+htmlCompress+"';\ndocument.body.insertAdjacentHTML('afterBegin',symbols)"
}

/**
 * [handleDrop 导出操作]
 */
let exprotsvg = document.querySelector(".exprotsvg")
let clear = document.querySelector(".clear")

clear.addEventListener("click",function(){
	svgList = []
	html = ""
	js = ""
	let table = document.querySelector(".file_table_body");
	table.innerHTML = ""
},false)

exprotsvg.addEventListener("mouseover",function(e){
	e.preventDefault()
},false)


exprotsvg.addEventListener("click",() => {

	if(svgList == ""){
	  ipc.send('open-error-dialog')
	}

	writeSvg()

	
	let self = exprotsvg;

	if(self.files && self.files[0]){

		let url = self.files[0].path
		// console.log(path.join(url,"svg-symbols.svg"))		
		fs.writeFileSync(path.join(url,"svg-symbols.svg"),html,'utf8');
		fs.writeFileSync(path.join(url,"svg-symbols.js"),js,'utf8');		

		createHtml(1)
	}	
},false)


//分离获得svg
function separate(str,item){
	let $ = cheerio.load(str.toString("utf-8")),
		html,CW,CH
	$("svg").find("defs").remove()

	if(!$("svg").attr("viewbox")){
		alert(item.name+".svg 文件不符合规范！")
		ipc.send('open-error-warnning')
		return;
	}

	CW = $("svg").attr("viewbox").split(" ")[2]
	CH = $("svg").attr("viewbox").split(" ")[3]
	if(Number(CW)%1 != 0 || Number(CH)%1 != 0){
		item.bool = 0
	}else{
		item.bool = 1
	}
	if(!pattern){
		CW = Math.ceil(CW);
		CH = Math.ceil(CH);
	}
	html = '<symbol id="'+item.name+'" viewBox="0 0 '+CW+' '+CH+'">'+$("svg").html()+'</symbol>'
	return html
}

ipc.on('open-error-dialog', function (event) {
  dialog.showErrorBox('导出错误', '没有导出数据.')
})

