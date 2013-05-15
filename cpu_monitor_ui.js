define(function(require,exports){

	var CPUJS = {};
	CPUJS.Monitor = CPUJS.Monitor || {};
	/**
	 * CPUJS Monitor的UI逻辑，如果不需要画图，就不需要引入这一份逻辑
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */

	CPUJS.Monitor.UI = CPUJS.Monitor.UI || {
		PANEL_WIDTH:200,//CPU曲线的画布宽度200px
		PANEL_HEIGHT:35,//CPU曲线的画布高度35px
		MAX_NUM:100,//最多在面板里面画多少个点
		STEP_WIDTH:3,//点之间的x轴距离
		ZOOM:1,//放大多少
		CURRENT_X:0,//当前的x轴坐标
		LAST_X:0,//上一个点的x坐标
		LAST_Y:0,//上一个点的y坐标
		point_list:[],//记录各个点的坐标，最多记录只够画布填满的N个点
		point_line:[],//记录所有的点
		DELAY:100,//每隔100ms触发画点逻辑
		canvasDom:null,
		canvas:null,
		container:null,//CPU曲线主容器
		hasInit:false,//只初始化一遍
		debugMode :false,//是否为调试模式，是的画会显示cpu曲线
		init:function(){
			 var p = CPUJS.Monitor.UI;
			 p.debugMode = true;
			 
			//p.debugMode = false;
			 if(CPUJS.Monitor.UI.Accessory.isHidden){
			 	CPUJS.Monitor.UI.Accessory.CloseBtn.show();
			 	return;
			 }
			
			if(p.debugMode&&!p.canvas){
				p.ZOOM = 2;//window.CPU_DEBUGGER_ZOOM;
				p.PANEL_WIDTH*=p.ZOOM;
				p.PANEL_HEIGHT*=p.ZOOM;
				p.STEP_WIDTH = p.PANEL_WIDTH/p.MAX_NUM;
				p.LAST_Y = p.PANEL_HEIGHT;
				p.initContainer();
				/*if(!p.Drawer.initCanvas()){
					return;
				}*/
				CPUJS.Monitor.UI.Accessory.init();
				
				/*var ui = (ua&&ua.ie<9)?'cpu_monitor_ui_vml':'cpu_monitor_ui_canvas';
				require.async(ui,function(m){
					debugger;
					CPUJS.Monitor.UI.Drawer = m;
				});*/
			}
			
			if(p.hasInit){
				return;
			}

			p.hasInit = true;
		},
		draw:function(per){
			var p = CPUJS.Monitor.UI;
			if(p.debugMode){//可视化
				var y =p.PANEL_HEIGHT-(per*p.PANEL_HEIGHT),x = p.CURRENT_X+p.STEP_WIDTH;
		 		p.Drawer.PercentNum.show(Math.round(per*100));
				if(p.point_list.length==p.MAX_NUM){
					po = p.point_list.shift();
					p.LAST_X = po[0];
					p.LAST_Y = po[1];
					p.point_list.push([p.PANEL_WIDTH,y]);
					p.Drawer.drawline();
				}else{
					p.Drawer.drawPoint(x,y);
					p.point_list.push([x,y]);
				}
	 		}	
		},
		initContainer:function(){
			var c = document.createElement("DIV");
			c.id = "qz_cpu_container";
			document.body.appendChild(c);
			c.style.cssText = "position:fixed;left:0px;top:0px;z-index:99999;cursor:pointer";
			var c1 = document.createElement("DIV");
			c1.id = "cpujs_monitor_ui_accessory_container";
			c.appendChild(c1);
			CPUJS.Monitor.UI.container = c1;
			QZFL.dragdrop.registerDragdropHandler(c,c);
		},
		Drawer:{
			
		}
	};
	
	//---------------------------------------
	/**
	 * CPUJS Monitor.UI的组件，例如一些显隐、暂停、放大缩小等功能按钮
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */

	CPUJS.Monitor.UI.Accessory = CPUJS.Monitor.UI.Accessory || {
		container:null,
		btnContainer:null,
		isHidden:false,
		init:function(){
			var p = CPUJS.Monitor.UI.Accessory;
			p.container = CPUJS.Monitor.UI.container;
			p.initBtnContainer();
			p.CloseBtn.init();
			p.PauseBtn.init();
			p.ZoomBtn.init();
		},
		initBtnContainer:function(){
			var p = CPUJS.Monitor.UI.Accessory;
			var div = document.createElement("div");
			div.id = "qz_cpu_btn_container";
			p.btnContainer = div;
			div.style.cssText = "position:absolute;width:300px;top:75px;float:right;";
			p.container.parentNode.appendChild(div);
		},
		addBtn:function(name,ns){
			var b = document.createElement("button");
			b.innerHTML = name;
			b.id = "qz_cpu_btn_"+name;
			b.style.cssText = "text-align:center;display:inline-block;border:1px solid;width:50px;background-color:black;color:#00FF00;";
			ns.btnDom = b;
			CPUJS.Monitor.UI.Accessory.btnContainer.appendChild(b);
			$j(b).click(ns[name]);
		},
		CloseBtn:{
			btnDom:null,
			init:function(){	
				CPUJS.Monitor.UI.Accessory.addBtn("hide",CPUJS.Monitor.UI.Accessory.CloseBtn);
			},
			hide:function(){
				var p = CPUJS.Monitor.UI.Accessory;
				p.isHidden = true;
				p.container.style.display = p.container.style.display=="none"?"":"none";
				p.PauseBtn.isPause = !p.PauseBtn.isPause;
				p.CloseBtn.btnDom.innerHTML = p.container.style.display=="none"?"show":"hide";
			},
			show:function(){
				var p = CPUJS.Monitor.UI.Accessory;
				p.isHidden = false;
				p.container.style.display = "";
				p.PauseBtn.isPause = false;
			}
		},
		PauseBtn:{
			btnDom:null,
			init:function(){
				CPUJS.Monitor.UI.Accessory.addBtn("pause",CPUJS.Monitor.UI.Accessory.PauseBtn);
			},
			isPause:false,
			pause:function(){
				var p = CPUJS.Monitor.UI.Accessory.PauseBtn;
				p.isPause = !p.isPause;
				if(p.isPause){
					CPUJS.Monitor.pause();
				}else{
					CPUJS.Monitor.resume();
				}
				p.btnDom.innerHTML = p.isPause?"resume":"pause";	
			}
		},
		ZoomBtn:{
			btnDom:null,
			zoomLevel:0,
			init:function(){
				if(ua.ie&&ua.ie<9){
					return;
				}
				CPUJS.Monitor.UI.Accessory.addBtn("zoom",CPUJS.Monitor.UI.Accessory.ZoomBtn);
			},
			zoom:function(){
				var map = [1,2,3,0.5],p = CPUJS.Monitor.UI.Accessory.ZoomBtn;
				p.zoomLevel++;
				p.zoomLevel %= map.length;
				var d = CPUJS.Monitor.UI.Accessory.container;
				if(d){
					d.style.zoom = map[p.zoomLevel];
					var _r = d.getBoundingClientRect(),_h;
					_h = _r.bottom - _r.top;
					CPUJS.Monitor.UI.Accessory.btnContainer.style.top = _h+"px";
				}
			}
		}
	};


	CPUJS.Monitor.UI.init();

	return CPUJS.Monitor.UI;

});















