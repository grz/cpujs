define(function(require,exports){
	var CPUJS = {};
	CPUJS.Monitor = CPUJS.Monitor || {};
	CPUJS.Monitor.UI = CPUJS.Monitor.UI || {};
	var Time_height = 20;
	/**
	 * @class 这个是Time的类，用来创建Time对象
	 * @param {String} label 一个简单的标识
	 * @param {Number} x Time 被创建的横坐标
	 * @param {String} color 自定义颜色
	 * @param {String} detail Time 的详细信息
	 * 
	 */
	function Time(label,x,color,detail){
		var p = this;
	 	/*if(Time_height>80+level_num*20){
	 		Time_height = 100;
	 	}*/
	 	if(!color){
	 		color = '#0f0';
	 	}
	 	if(!detail){
	 		detail = "";
	 	}
	 	p.item = document.createElement('div');
		p.item.style.cssText = 'z-index:100001;position:absolute;border-color:#0f0;top:-20px;left:'+x+'px;width:1px;height: '+Time_height+'px;background-color: '+color+';';
		p.labelItem = document.createElement('span');
		p.labelItem.style.cssText = 'position:absolute;top:0px;background-color:rgb(0,0,0);color:'+color+';border:0px 0px 0px 1px solid;border-color:'+color+';';
		p.item.appendChild(p.labelItem);
		p.item.style.left = x+'px';
		p.labelItem.innerHTML = label;
		p.labelItem.title = detail;
		p.left = x;
	}
	/**
	 * 让Time跟随曲线运动起来
	 */
	Time.prototype.updateTime = function(time){
	 	var p = this;
	 	if(!p.item){
			return;
		}
		p.item.time += time;
		var ot = p.item.innerHTML.replace("s","");
		console.log("^^^^^^^^^^^^^^^^^^^^time:"+ot);
		p.item.innerHTML = (Number(ot)+time)+"s";
	};
	/**
	 * CPUJS Monitor的Timeline模块，用于在曲线上打出时间点，方便调试
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */
	CPUJS.Monitor.UI.Timeline = {
		itemList:[],
		container:null,
		bootstrap:function(panelWidth,stepWidth,container){
			var sw = stepWidth*5;
			var num = Math.floor(panelWidth/sw),t;
			CPUJS.Monitor.UI.Timeline.container = container;
			if(!num){
				return;
			}
			for(var i=0;i<num;i++){
				t = 0.5*i+"s";
				CPUJS.Monitor.UI.Timeline.make(t,0+i*sw);
			}
			
		},
		/**
		 * 开放给外部的一个接口,用于创建一个Time对象
		 * @param {String} label 在Time里面写的信息
		 * @param {Number} x Time初始化的横坐标
		 * @param {String} color 自定义颜色
		 * @param {String} detail Time 的详细信息
		 * @return {Object} TimeItem Time对象的dom节点
		 */
		make:function(label,x,color,detail){
			var p = CPUJS.Monitor.UI.Timeline,m = new Time(label,x,color,detail);
			p.itemList.push(m);
			p.container.appendChild(m.item);
		},
		update:function(time){
			return;//怕有性能问题，暂时不实现这个
			var list = CPUJS.Monitor.UI.Timeline.itemList;
			for(var i=0,len = list.length;i<len;i++){
				if(list[i]&&typeof(list[i].updateTime)=="function"){
					list[i].updateTime(time);
				}
			}
		}
	};
	exports.bootstrap = CPUJS.Monitor.UI.Timeline.bootstrap;
	exports.update = CPUJS.Monitor.UI.Timeline.update;
	//return CPUJS.Monitor.UI.Timeline;
});
