define(['./cpu_monitor_ui'],function(require,exports){

	var CPUJS = {};
	CPUJS.Monitor = CPUJS.Monitor || {};
	/**
	 * CPUJS Monitor的UI逻辑，如果不需要画图，就不需要引入这一份逻辑
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */
	CPUJS.Monitor.UI = require('./cpu_monitor_ui');

	/**
	 * CPUJS Monitor的UI逻辑，这个Monitor.UI.Canvas是给支持HTML canvas的浏览器使用的
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */
	CPUJS.Monitor.UI.Drawer = {
		initCanvas:function(){
			var p =CPUJS.Monitor.UI;
			p.canvasDom = document.createElement("CANVAS");
			if(p.canvasDom&&typeof(p.canvasDom.getContext)=="function"){
				p.canvasDom.id = "cpujs_monitor_ui_canvas";
				p.canvasDom.width = p.PANEL_WIDTH;
				p.canvasDom.height = p.PANEL_HEIGHT;
				p.container.appendChild(p.canvasDom);
				p.canvas = p.canvasDom.getContext("2d");
				var c = p.canvas;
				c.fillStyle = "rgb(0,0,0)";
				c.lineWidth = p.ZOOM;
				c.lineCap = "round";
				c.lineJoin = "round";
				c.fillRect(0, 0, p.PANEL_WIDTH, p.PANEL_HEIGHT);		
				c.beginPath();
				c.strokeStyle = "rgb(0,255,0)";
				c.stroke();
				p.Drawer.PercentNum.init();
				return true;
			}
			return false;
		},
		/**
		 * 从上一个点把线连到一个新的点（x,y）是这个点的坐标
		 */
		drawPoint:function(x,y){
			var p = CPUJS.Monitor.UI,c = p.canvas;
			var g = c.createLinearGradient(0,0,0,p.PANEL_HEIGHT);
			g.addColorStop(0,'rgb(255,0,0)');
			g.addColorStop(0.6, "#FFFF00");
			g.addColorStop(1,'rgb(0,255,0)');
			c.strokeStyle = g;
			c.beginPath(); 
			c.moveTo(p.LAST_X,p.LAST_Y);
			c.lineTo(x,y);
			p.CURRENT_X =x;
			p.LAST_X = x;
			p.LAST_Y = y;
			c.stroke();
		},
		/**
		 * 一次性将所有的线给绘制出来，方便实现曲线的平移
		 */
		drawLine:function(){
			var p = CPUJS.Monitor.UI,po;
			p.canvas.fillRect(0, 0, p.PANEL_WIDTH, p.PANEL_HEIGHT); 
			for(var i=0,len=p.point_list.length;i<len;i++){
				po = p.point_list[i];
				CPUJS.Monitor.UI.Drawer.drawPoint(po[0],po[1]);
				po[0]-=p.STEP_WIDTH;
			}
			CPUJS.Monitor.UI.Mark.move();
		},
		/**
		 * cpu曲线的百分比数字
		 */
		PercentNum:{
			PANEL_WIDTH:50,
			PANEL_HEIGHT:35,
			canvasDom:null,
			canvas:null,
			init:function(){
				var p = CPUJS.Monitor.UI.Drawer.PercentNum;
				p.PANEL_WIDTH*=CPUJS.Monitor.UI.ZOOM;
			 	p.PANEL_HEIGHT*=CPUJS.Monitor.UI.ZOOM;
				p.canvasDom = document.createElement("CANVAS");
				if(p.canvasDom&&typeof(p.canvasDom.getContext)=="function"){
					p.canvasDom.id = "cpujs_monitor_ui_canvas_per_num";
					p.canvasDom.style.cssText = "left:"+CPUJS.Monitor.UI.PANEL_WIDTH+"px;top:0px;";
					p.canvasDom.width = p.PANEL_WIDTH;
					p.canvasDom.height = p.PANEL_HEIGHT;
					CPUJS.Monitor.UI.container.appendChild(p.canvasDom);
					p.canvas = p.canvasDom.getContext("2d");
					var c = p.canvas;
					c.fillStyle = "rgb(0,0,0)";
					c.lineWidth = p.ZOOM;
					c.lineCap = "round";
					c.lineJoin = "round";
					c.fillRect(0, 0, p.PANEL_WIDTH, p.PANEL_HEIGHT);		
					c.beginPath();
					c.stroke();
					var fontSize = "40",
					fontWeight = "normal",
					fontStyle = "normal",
					fontFace="arial";
					c.font = fontWeight + " " + fontStyle + " " + fontSize + "px " + fontFace;
					c.fillStyle = "#ff0000";
					c.textBaseLine = "middle";
					c.textAlign = "center";
					//c.fillText("abc",0,0);
					return true;
				}
				return false;
			},
			clear:function(){
				var p = CPUJS.Monitor.UI.Drawer.PercentNum;
				p.canvas.fillStyle = "rgb(0,0,0)";
				p.canvas.fillRect(0, 0, p.PANEL_WIDTH, p.PANEL_HEIGHT);	
			},
			show:function(num){
				var p = CPUJS.Monitor.UI.Drawer.PercentNum;
				p.clear();
				p.canvas.fillStyle = "#00ff00";
				if(num>25){
					p.canvas.fillStyle = "#FFFF00";
				}
				if(num>50){
					p.canvas.fillStyle = "#FF6600";
				}
				if(num>80){
					p.canvas.fillStyle = "#FF0000";
				}
				p.canvas.fillText(num+"%",p.PANEL_WIDTH/2,p.PANEL_HEIGHT/2+20);
			}
		}
	};

	CPUJS.Monitor.UI.bootstrap = function(){
		CPUJS.Monitor.UI.init();
		CPUJS.Monitor.UI.Drawer.initCanvas();
	}

	return CPUJS.Monitor.UI;
	;
});















