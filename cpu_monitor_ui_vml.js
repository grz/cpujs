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
	 * CPUJS Monitor的UI逻辑，这个Monitor.UI.VML是给不支持HTML canvas的浏览器使用的
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */
	//for IE8/7/6
	CPUJS.Monitor.UI.Drawer = {
		VMLItems:[],
		initCanvas:function(){
			var p = CPUJS.Monitor.UI;
			document.namespaces&&document.namespaces.add&&document.namespaces.add('v', 'urn:schemas-microsoft-com:vml');
			p.Drawer.insertStyleSheet("cpujs_monitor_ui_vml_css","v\\:* { behavior: url(#default#VML);} v\\:shape { behavior: url(#default#VML);} v\\:line { behavior: url(#default#VML);} v\\:path { behavior: url(#default#VML);} v\\:textpath { behavior: url(#default#VML);} v\\:fill { behavior: url(#default#VML);}");
			p.canvasDom = document.createElement("div");
			p.canvasDom.id = "cpujs_monitor_ui_vml";
			p.canvasDom.innerHTML = '<v:shape id="cpujs_monitor_ui_canvas_shape"\
			  fillcolor="black"\
			  coordorigin="0 0"\
			  coordsize="200 200"\
			  strokecolor="black"\
			  strokeweight="0pt"\
			  style="position:absolute;top:0px;left:0px;z-index:99999;width:'+p.PANEL_WIDTH+'px;height:'+p.PANEL_HEIGHT+'px;">\
			  <v:path v="m 1,1 l 1,200, 200,200, 200,1 x e" />\
			</v:shape>';
			p.container.appendChild(p.canvasDom);
			p.Drawer.PercentNum.init();
			return true;
		},
		insertStyleSheet: function(sheetId, rules){
			var node = document.createElement("style");
			node.type = 'text/css';
			sheetId && (node.id = sheetId);
			document.getElementsByTagName("head")[0].appendChild(node);
			if (rules) {
				if (node.styleSheet) {
					node.styleSheet.cssText = rules;
				} else {
					node.appendChild(document.createTextNode(rules));
				}
			}
			return node.sheet || node;
		},
		drawPoint:function(x,y,index){
			var p = CPUJS.Monitor.UI,c = p.canvas,l;
			if(typeof(index)!="undefined"&&p.Drawer.VMLItems[index]){
				l = p.Drawer.VMLItems[index];
				l.from = p.LAST_X+","+p.LAST_Y;
				l.to = x+","+y;
			}else{
				l = document.createElement("p");
				l.innerHTML = '<v:line style="position:absolute;left:0px;top:0px;z-index:99999;" id="'+"QZ_CPU_VML_LINE_"+p.line_index+'" strokecolor="#00FF00" strokeweight="'+p.ZOOM+'px" from="'+p.LAST_X+","+p.LAST_Y+'" to="'+x+","+y+'" ></v:line>';
				p.canvasDom.appendChild(l);
				p.Drawer.VMLItems.push(l.firstChild);
				p.line_index++;
			}
			p.CURRENT_X =x;
			p.LAST_X = x;
			p.LAST_Y = y;
		},
		drawline:function(){
			var p = CPUJS.Monitor.UI,po;
			for(var i=0,len=p.point_list.length;i<len;i++){
				po = p.point_list[i];
				p.Drawer.drawPoint(po[0],po[1],i);
				po[0]-=p.STEP_WIDTH;
			}
		},
		PercentNum:{
			PANEL_WIDTH:50,
			PANEL_HEIGHT:35,
			canvasDom:null,
			canvas:null,
			init:function(){
				var p = CPUJS.Monitor.UI.Drawer.PercentNum;
				p.PANEL_WIDTH=50;
			 	p.PANEL_HEIGHT=35;
				p.PANEL_WIDTH*=CPUJS.Monitor.UI.ZOOM;
			 	p.PANEL_HEIGHT*=CPUJS.Monitor.UI.ZOOM;
				//p.canvasDom = document.getElementById("cpujs_monitor_ui_vml");
				p.canvasDom = document.createElement("div");
				p.canvasDom.id = "cpu_js_canvas_per_num";
				p.canvasDom.style.zIndex = 100000;
				//p.canvasDom.style.cssText="position:fixed;z-index:99999";
				//p.canvasDom.style.position = "fixed";
				p.canvasDom.innerHTML = '<v:shape id="cpu_js_canvas_shape_per_num"\
				  fillcolor="black"\
				  coordorigin="0 0"\
				  coordsize="200 200"\
				  strokecolor="black"\
				  strokeweight="0pt"\
				  style="position:absolute;top:0px;left:'+CPUJS.Monitor.UI.PANEL_WIDTH+'px;z-index:99999;width:'+p.PANEL_WIDTH+'px;height:'+p.PANEL_HEIGHT+'px;">\
				  <v:path v="m 1,1 l 1,200, 200,200, 200,1 x e" />\
				</v:shape>';
				CPUJS.Monitor.UI.container.appendChild(p.canvasDom);
			},
			show:function(num){
				var p = CPUJS.Monitor.UI.Drawer.PercentNum;
				var d = document.getElementById("cpu_js_canvas_shape_per_num_text");
				if(!d){
					d = document.createElement("p");
					d.style.cssText = "position:absolute;top:0px;left:0px;z-index:100000;";
					d.id = "cpu_js_canvas_shape_per_num_text";
					p.canvasDom.insertBefore(d,p.canvasDom.firstChild); 
				}
				var color = "#00FF00";
				if(num>25){
					color = "#FFFF00";
				}
				if(num>50){
					color = "#FF6600";
				}
				if(num>80){
					color = "#FF0000";
				}
				
				if(d){
					var h = '<v:line from="'+CPUJS.Monitor.UI.PANEL_WIDTH+','+(p.PANEL_HEIGHT/2-1)+'" to="'+(CPUJS.Monitor.UI.PANEL_WIDTH+p.PANEL_WIDTH)+','+(p.PANEL_HEIGHT/2)+'"><v:fill on="True" color="'+color+'"/><v:path textpathok="True"/><v:textpath on="True" string="'+num+'%" style="font:normal normal normal 36pt Tahoma"/></v:line>';
					d.innerHTML = h;
				}
			}
		}
	};
	CPUJS.Monitor.UI.Drawer.initCanvas();
	return CPUJS.Monitor.UI;
});















