define(function(require,exports){
	var CPUJS = {};
	CPUJS.Monitor = CPUJS.Monitor || {};
	CPUJS.Monitor.UI = CPUJS.Monitor.UI || {};
	var mark_height = 100,//起始高度
		level_num=100,//最多一列可以显示多少个mark
		lastX=0;//上一个mark的x坐标



	seajs && seajs.on("define",doDefine);

	function doDefine(data){//打出seajs加载的东西
		if(typeof(cpujs)!="undefined"){
            var c = "#d8ff02",t="js";
            if(data.uri.indexOf("qzone/v8")>-1||data.uri.indexOf("qzone/v6")>-1){
                c = "#0ad1ff";
            }
            if(data.uri.indexOf(".js")==-1){
                c = "#6b3099";
                t = "others";
            }
			cpujs.mark(t,c,data.id||data.uri);
		}
	}

	/**
	 * @class 这个是Mark的类，用来创建Mark对象
	 * @param {String} label 一个简单的标识
	 * @param {Number} x Mark 被创建的横坐标
	 * @param {String} color 自定义颜色
	 * @param {String} detail Mark 的详细信息
	 * 
	 */
	function Mark(label,x,color,detail){
	 	var p = this;
	 	if(x==lastX){
	 		mark_height+=20;
	 	}else{
	 		mark_height = 100;
	 	}
	 	lastX = x;
	 	
	 	if(!color){
	 		color = '#0f0';
	 	}
	 	if(!detail){
	 		detail = "";
	 	}
	 	p.item = document.createElement('div');
		p.item.style.cssText = 'z-index:100001;position:absolute;border-color:#0f0;top:0px;left:'+x+'px;width:1px;height: '+mark_height+'px;background-color: '+color+';';
		p.labelItem = document.createElement('span');
		p.labelItem.style.cssText = 'position:absolute;top:'+mark_height+'px;background-color:rgb(0,0,0);color:'+color+';border:1px solid;border-color:'+color+';';
		p.item.appendChild(p.labelItem);	
		p.item.style.left = x+'px';
		p.labelItem.innerHTML = label;
		p.labelItem.title = detail;
		p.left = x;
	}
	/**
	 * 让Mark跟随曲线运动起来
	 */
	Mark.prototype.move = function(offset){
	 	var p = this;
	 	if(!p.item){
				return;
			}
		if(p.left<-20){
			p.die();
			return;
		}
		var left = parseInt(p.item.style.left.replace("px",""),10)-offset;
		p.item.style.left = left+"px";
		p.left = left;
	};
	/**
	 * 让Mark自我销毁
	 */
	Mark.prototype.die = function(){
		if(this.item.parentNode){
			CPUJS.Monitor.UI.Mark.release(this.item);
			this.item.parentNode.removeChild(this.item);
		}
	};
	/**
	 * CPUJS Monitor的Mark模块，用于在曲线上打一些标签，方便调试
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */
	CPUJS.Monitor.UI.Mark = {
		itemList:[],
		labelItem:null,
		left:-21,
		/**
		 * 开放给外部的一个接口,用于创建一个Mark对象
		 * @param {String} label 在Mark里面写的信息
		 * @param {Number} x Mark初始化的横坐标
		 * @param {String} color 自定义颜色
		 * @param {String} detail Mark 的详细信息
		 * @return {Object} markItem Mark对象的dom节点
		 */
		make:function(label,x,color,detail){
			var p = CPUJS.Monitor.UI.Mark,m = new Mark(label,x,color,detail);
			p.itemList.push(m);
			return m.item;
		},
		/**
		 * 开放给外部的一个接口,用于销毁一个Mark对象
		 */
		release:function(item){
			var list = CPUJS.Monitor.UI.Mark.itemList;
			for(var i=0,len=list.length;i<len;i++){//由于一个时间片同时会有多个mark，所以不能简单用队列的先来后到，还是得用查询的方式
				if(list[i]==item){
					list.splice(i,1);
				}
			}
		},
		/**
		 * 开放给外部的一个接口,用于控制Mark对象的位移
		 * @param {Number} offset Mark每次要左移的偏移量
		 */
		move:function(offset){
			var list = CPUJS.Monitor.UI.Mark.itemList;
			for(var i=0,len=list.length;i<len;i++){
				if(list[i]&&"function"==typeof(list[i].move)){
					list[i].move(offset);
				}
			}
		}
	};
	return CPUJS.Monitor.UI.Mark;
});

