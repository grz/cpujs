/////////////
//CPUJS.js
/////////////
define(function(require,exports){
	var CPUJS = {};
	if(Date&&"function"==typeof(Date.now)){
		CPUJS.__gnt = Date.now;//这个接口ie9及以上的浏览器才有，效率是new Date()3.5倍多
	}else{
		CPUJS.__gnt = function(){
			return new Date();
		}
	}
	function isArray(arr){
		if(!arr){
			return false;
		}
		if(Object.prototype.toString.call(arr).slice(8, -1).toLowerCase()=="array"){
			return true;
		}
		return false;
	}
	/**
	 * log函数，只在cpujs_debugger 或  cpujs.TurnOn.log为true的时候才log出来
	 */
	CPUJS.log = function(s){
		if(!CPUJS.TurnOn.Log){
			return;
		}
		if(window.console&&window.console.log){
			window.console.log("### CPUJS Log:"+s);
		}
	};
	/**
	 * mark功能，只在url里附加"cpujs_debugger"启动调试模式才会体现出来
	 * 用于在cpu曲线上打出一个标志，方便调试问题
	 * @param {String} label 要显示的文字
	 * @param {String} color 自定义颜色
	 * @param {String} detail Mark 的详细信息
	 */
	CPUJS.mark = function(label,color,detail){
		if(CPUJS.TurnOff.MARK){
			return;
		}
		if(CPUJS.Monitor.UI&&"function"==typeof(CPUJS.Monitor.UI.drawMark)){
			CPUJS.Monitor.UI.drawMark(label,color,detail);
		}
	};
	/**
	 * 优先采用效率更高的Date.now，效率是new Date()3.5倍多
	 */
	CPUJS.now = CPUJS.__gnt;
	/**
	 * CPUJS的配置
	 */
	CPUJS.Config = {
		TM_MAX_CPU:30,//设置任务调度器尽量不要超过的CPU阀值
		TM_MISSION_DELAY:5//设置单次任务执行时间超过多少ms要被log出来
	};
	/**
	 * CPUJS的开关，用来按需选择打开一些默认不开启的功能
	 */
	CPUJS.TurnOn = {
		Monitor:false,//是否开启cpu曲线
		Stat:false,//是否开启统计功能	
		Log:false,//是否开启log功能
		TryCatch:false,//是否开启任务执行的tryCatch功能，避免任务执行失败影响整体调度
		ConsoleUI:false//在console里面实时打出的cpu曲线per值，方便查看发生卡的附近执行了哪些函数
	};
	/**
	 * CPUJS的开关，用来关掉一些默认开启的功能
	 */
	CPUJS.TurnOff = {
		TM:false,//是否关闭任务管理器智能调度
		FastLoad:false,//是否关闭FastLoad
		MARK:false,//是否关闭Mark功能
		EnergySave:false//是否关闭节能功能(按需启动Monitor，当不没有服务的时候就暂停运转)
	};
	/**
	 * CPUJS的监控引擎，定时打点，看实际点与点之间的间隔来判断当前卡的程度
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */
	CPUJS.Monitor = {
		DELAY:100,//每隔100ms采集一个时间点的CPU开销数据
		CPUJS:null,//需要用到的cpu实例
		hasInit:false,//保证只需要初始化一次
		timerID:null,//定时采集数据的定时器ID
		lastTime:0,//上一个点的绝对时间
		currentTime:0,//当前点的绝对时间
		isPause:null,//是否被暂停
		/**
		 * 初始化
		 */
		init:function(){
			QZONE.console && QZONE.console.log && QZONE.console.log('CPUJS.Monitor.init(): start'); //log

			var p = CPUJS.Monitor;
			if(p.hasInit){
				QZONE.console && QZONE.console.log && QZONE.console.log('CPUJS.Monitor.init(): have initialized, return'); //log
				return;
			}
			p.run();//Monitor开始工作
			p.hasInit = true;
			p.lastTime = CPUJS.now();
			if(CPUJS.TurnOn.Monitor){//如果需要UI渲染则拉取UI库
				var ui = (ua && ua.ie < 9) ? './cpu_monitor_ui_vml' : './cpu_monitor_ui_canvas';
				require.async(ui, function(m){
					QZONE.console && QZONE.console.log && QZONE.console.log('CPUJS.Monitor.init(): cpujs UI loaded'); //log
					m.ZOOM = 2;
					m.PANEL_WIDTH = document.body.clientWidth/2-50;
					CPUJS.Monitor.UI = m;
					CPUJS.Monitor.UI.bootstrap();
				});
			}

			QZONE.console && QZONE.console.log && QZONE.console.log('CPUJS.Monitor.init(): end'); //log
		},
		/**
		 * 在console打印出cpu曲线
		 */
		drawUIByConsole:function(per){
			var n = Math.round(per * 10), s="▆";
			for(var i = n; i--;){
				s += "▆";
			}
			s += Math.round(per * 100);
			CPUJS.log(s);
		},
		/**
		 * 让Monitor运作起来
		 */
		run:function(){
			var p = CPUJS.Monitor,per;
			p.timerID = setTimeout(function(){
				if(p.isPause){
					return;
				}
				p.currentTime = CPUJS.now();
				per = ((p.currentTime-p.lastTime)-p.DELAY)/p.DELAY;
				if(per<0){
					per = 0;
				}
				if(per>1){
					per = 1;
				}
				p.lastTime = p.currentTime;
				var stepPer = CPUJS.Monitor.Data.lagOPT.getStepPer(CPUJS.now(),per);
				var n = Math.floor(stepPer/0.5)+1;
				var _per = per;
				if(n>1){
					_per = 1;
				}
				CPUJS.TM.GearBox.adjust(per);
				//避免长时间的暂停跟真正的卡住搞混，所以要打一个标记
				if(p.resumeFlag){
					p.resumeFlag = false;
				}else{
					//0.5是因为CPU开销达到50%时从时间延时上来看是CPU0%时的1.5倍
					for(var i=0;i<n;i++){//当出现卡的时候会根据实际延时来考虑一次性多打几个点，这里只是假设每次实际超过100%时它前一个点都是100%，这样来适当补画多几个100%的点，来避免实际面积误差太大。但这里的算法只是采取粗略的拟补，目的是为了cpu曲线画起来点之间的步长一致，总体看起来更协调，而减少了这里的精度。
						p.log(per);//打点
					}
				}
				p.timerID = setTimeout(arguments.callee,p.DELAY);
			},p.DELAY);
		},
		/**
		 * 暂停采集数据
		 */
		pause:function(){
			clearTimeout(CPUJS.Monitor.timerID);
			CPUJS.Monitor.isPause = true;
			CPUJS.log("###########################CPUJS Monitor PAUSE!!!!!!!!!");
		},
		/**
		 * 标识是不是刚刚被重启
		 */
		resumeFlag:false,
		/**
		 * 继续采集数据
		 */
		resume:function(){
			var p = CPUJS.Monitor;
			if(p.isPause!=null&&!p.isPause){
				return;
			}
			//避免长时间的暂停跟真正的卡住搞混，所以每次重启的时候都加上一个0的数值。
			p.lastTime = CPUJS.now()+10000;//上一个点的绝对时间
			//p.currentTime = CPUJS.now();//当前点的绝对时间
			p.isPause = false;
			p.resumeFlag = true;
			CPUJS.log("###########################CPUJS Monitor RESUME!!!!!!!!!");
			p.run();
		},
		/**
		 * 多服务管理，目的是当没有服务需求的时候可以停掉Monitor
		 */
		svr:{
			timerID:null,
			count:0,
			/**
			 * 添加服务请求
			 * @param {Number} num 批量添加的服务数
			 */
			add:function(num){
				if(!num){
					num = 1;
				}
				var p = CPUJS.Monitor.svr;
				p.count+=num;
				CPUJS.log("CPU Monitor Svr Num:"+CPUJS.Monitor.svr.count);
				clearTimeout(p.timerID);
				CPUJS.Monitor.resume();
			},
			/**
			 * 删除服务请求
			 * @param {Number} num 批量删除的服务数
			 */
			remove:function(num){
				if(CPUJS.TurnOff.EnergySave){
					return;
				}
				if(!num){
					num = 1;
				}
				var p = CPUJS.Monitor.svr;
				p.count-=num;
				clearTimeout(p.timerID);
				CPUJS.log("CPU Monitor Svr Num:"+CPUJS.Monitor.svr.count);
				if(p.count==0){
					p.timerID = setTimeout(CPUJS.Monitor.pause,1000);
				}
			}
		},
		/**
		 * 记录百分比
		 * @param {Number} per 当前检测到的百分比
		 */
		log:function(per){
			var p = CPUJS.Monitor;
			CPUJS.TM.GearBox.adjust(per);
			if(CPUJS.TurnOn.Stat){//只有打开stat功能的时候才会收集数据
				CPUJS.Monitor.Data.log(per);//统计
			}
			if(CPUJS.Monitor.UI&&"function"==typeof(CPUJS.Monitor.UI.draw)){
				CPUJS.Monitor.UI.draw(per);//画cpu曲线
			}
			if(CPUJS.TurnOn.ConsoleUI){//如果打开console UI就会在console里面画CPU曲线
				p.drawUIByConsole(per);
			}
		},
		/**
		 * 开放给外部的一个获取当前环境cpu开销的接口
		 * @param {Number} per 当前检测到的百分比
		 */
		getCurrentCPU:function(cb){
			var per = CPUJS.Monitor.Data.getCurrentCPU();
			if(typeof(cb)=='function'){
				setTimeout(function(){
					cb(per);
				},0);
			}
		}
	};
	/**
	 * CPU数据采集引擎，收集和加工CPU相关的各种数据
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */
	CPUJS.Monitor.Data = CPUJS.Monitor.Data || {
		//!!!\\这里的数据会反应出实际超出100%时多打几个点的情况
		//算卡的情况得看这里的数据
		dataArray:[],//记录每个点对应的cpu开销
		timeArray:[],//记录每次的时间点
		/**
		 * 记录百分比
		 * @param {Number} per 当前检测到的百分比
		 */
		log:function(per){
			var p = CPUJS.Monitor.Data;//
			p.dataArray.push(per);
			p.timeArray.push(CPUJS.now());
			//CPUJS.log("CURRENT PER:"+per);
		},
		/**
		 * 返回当前的CPU开销情况
		 * @return {Number} per 当前检测到的百分比
		 */
		getCurrentCPU:function(){
			//取最近的3个cpu点做平均
			var p=CPUJS.Monitor.Data,
			a = p.dataArray,c=0,len=a.length,sum=0;
			for(var i=len-1;i>=0;i--){
				sum+=a[i];
				c++;
				if(c>=3){
					break;
				}
			}
			if(c==0){
				return 0;
			}
			return sum/c;
		},
		/**
		 * 返回指定时间的下标，确定要统计的点的时间范围
		 * @param {Number} time 从0开始的毫秒数
		 * @param {Boolean} isEndTime 是否结束时间
		 * @return {Number} 对应时间的下标
		 */
		getTimeIndex:function(time,isEndTime){
			var p = CPUJS.Monitor.Data.timeArray;
			for(var i=0;i<p.length;i++){
				if(!isEndTime){
					if(p[i]-p[0]>=time){
						return i;
					}
				}else{
					if(p[i]-p[0]>time){
						return i-1;
					}
				}
			}
			return p.length;
		},
		/**
		 * 获取一定时间段之内的超过某一定百分比值的点的数量
		 * @param {Number} per 百分比基准值
		 * @param {Number} beginTime 起始时间，从0开始，单位毫秒
		 * @param {Number} endTime 结束时间，单位毫秒
		 */
		getOverPerAmount:function(per,beginTime,endTime){
			var p = CPUJS.Monitor.Data,d = CPUJS.Monitor.DELAY*2,
			begin = p.getTimeIndex(beginTime),//Math.round(beginTime/d),
			end = p.getTimeIndex(endTime,1),//Math.round(endTime/d),
			da = p.dataArray,sum=0;
			for(var i=begin;i<end;i++){
				if(typeof(da[i])!="undefined"&&da[i]>=per){
					sum++;
				}
			}
			return sum;
		},
		/**
		 * 返回一定时间段的cpu开销面积
		 * @param {Number} beginTime
		 * @param {Number} endTime
		 */
		getTotalSize:function(beginTime,endTime){//CPUJS.Monitor.Data
			return CPUJS.Monitor.Data.lagOPT.getTotalSize.apply(CPUJS.Monitor.Data,arguments);
		},
		//当出现卡的时候会根据实际延时来考虑一次性多打几个点，这里只是假设每次实际超过100%时它前一个点都是100%，这样来适当补画多几个100%的点，来避免实际面积误差太大。但这里的算法只是采取粗略的拟补，目的是为了cpu曲线画起来点之间的步长一致，总体看起来更协调，而减少了这里的精度。
		lagOPT:{//优化卡住太久在画线上体现不出来的问题，优化后如果卡住的话，会一次性多画几个点，来反应卡的程度
			per_line:[],//记录每个点对应的cpu开销
			time_line:[],//没个点的时间坐标记录下来
			size_line:[],//记录每个店对应的cpu开销面积
			averageTime:CPUJS.Monitor.DELAY,//如果cpu一直是0%，那就是200ms打一个点
			totalSize:0,//从启动到现在累计的总开销
			/**
			 * 获取一段时间的总面积，衡量这段时间的总开销
			 * @param {Number} beginTime 开始时间
			 * @param {Number} endTime  结束时间
			 */
			getTotalSize:function(beginTime,endTime){
				var p = CPUJS.Monitor.Data,d = CPUJS.Monitor.DELAY*2,
				begin = p.getTimeIndex(beginTime),//Math.round(beginTime/d),
				end = p.getTimeIndex(endTime,1),da = p.dataArray,totalSize=0,_e;//Math.round(endTime/d),
				_e = p.lagOPT.size_line[end];
				if(!_e){
					_e = p.lagOPT.size_line[p.lagOPT.size_line.length-1];
				}
				totalSize = _e-p.lagOPT.size_line[begin];
				return totalSize;
			},
			/**
			 * 计算当前的实际百分比，然后限制在最高100%的时候需要补画多少个点，确保面积不受影响
			 * @param {Number} time 当前这个点的时间
			 * @param {Number} per  当前的CPU百分比
			 */
			getStepPer:function(time,per){//CPUJS.Monitor.Data.lagOPT.getAverageTime()
				var p = CPUJS.Monitor.Data.lagOPT;
				p.time_line.push(time);
				var cd;
				p.per_line.push(per);
				var len = p.time_line.length;
				if(p.time_line.length==1){
					cd = p.averageTime;
				}else{
					cd = time-p.time_line[len-2];
				}
				if(cd<p.averageTime){
					cd = p.averageTime;
				}
				var _stepPer = (cd-p.averageTime)/p.averageTime;
				if(len>=2){
					p.totalSize += ((p.per_line[len-1]+p.per_line[len-2])*(p.time_line[len-1]-p.time_line[len-2])/2);
					p.size_line.push(p.totalSize);
				}else{
					p.size_line.push(0);
				}
				if(p.per_line.length>2){//省内存，最多保存两个值
					p.per_line.shift();
					p.time_line.shift();
				}
				return _stepPer;
			}
		}
	};
	//----------------------------------------------
	/**
	 * CPU数据统计引擎，目前统计的未读有各个CPU百分比区间的点数，可以用来衡量卡的情况；还有总面积，可以用来衡量总体开销
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */
	CPUJS.Monitor.Stat = CPUJS.Monitor.Stat || {
		flagArr:[],
		cpuRangeArr:[1,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2,0.1,0],
		timeRangeArr:[0,10000],
		count:0,//当前发起统计请求的数量，如果这个数量大于零，先不停掉采集数据的逻辑
		/**
		 * 统计10秒内cpu的各个百分比的次数
		 * @param {Number} 如果是数字，表示从当前起统计多长时间
		 * @param {Array} 如果是数组，Array[0]表示起始绝对时间，Array[1]表示结束时间；默认是从0毫秒到10000毫秒（必须传起始时间点和结束时间点）
		 * @param {Function} 收集到数据后传给回调函数
		 */
		doCPUStat:function(duration,callback){
			var a = [],p=CPUJS.Monitor.Stat,dur,begin,end;
			if(isArray(duration)){
				if(isNaN(parseInt(duration[0]))||isNaN(parseInt(duration[1]))){
					return;
				}
				if(parseInt(duration[0])>=parseInt(duration[1])){
					return;
				}
				dur = duration[1]-duration[0];
				begin = duration[0];
				end = duration[1];
			}else if(isNaN(parseInt(duration))){
				return;
			}else{
				dur = duration;
				begin = CPUJS.now();
				end = CPUJS.now()+dur;
			}
			CPUJS.Monitor.svr.add();//新增一次Monitor服务请求
			setTimeout(
				(function(b,e){
					return	function(){
						for(var i=0,len=p.cpuRangeArr.length;i<len;i++){
							a.push(CPUJS.Monitor.Data.getOverPerAmount(p.cpuRangeArr[i],b,e));
						}
						var totalSize = Math.round(CPUJS.Monitor.Data.getTotalSize(b,e));
						a.push(totalSize);//补开销面积
						var lagPer = Math.round(((a[0]/a[10])+0.0001)*100);//加0.001是避免0%被系统过滤掉
						a.push(lagPer);//补卡死占全部时间的比例
						if("function"==typeof(callback)){
							callback(a);
						}
						CPUJS.Monitor.svr.remove();//每次都激活一下服务
					}
				})(begin,end)
			,dur);
		}
	};
	/**
	 * CPU任务调度引擎，属于CPUJS的高级应用封装，目的是希望通过当前页面整体的CPU开销情况来动态调度任务，避免一次性执行太多任务导致页面卡死而无法马上响应用户的交互行为，导致用户觉得页面很卡
	 * @author rizenguo  aka  GRZ/郭小帅
	 * @type 
	 */
	CPUJS.TM = CPUJS.TaskManager = {
		lock:false,//任务调度器保证全局只有一个在运行
		DELAY:50,//每隔多久执行一次任务调度
		/**
		 * 给外部加载任务的接口
		 * @param {Function} fn 需要被执行的任务
		 */
		load:function(fn){
			CPUJS.log("TM Normal Load");
			var args = Array.prototype.slice.call(arguments,1);
			if(args&&args.length>0){
				fn.__args = args;
			}
			CPUJS.TM.Loader.load(fn,2);
		},
		/**
		 * 给外部加载异步回调任务
		 * @param {Function} fn 需要被执行的任务
		 */
		asynLoad:function(fn){
			CPUJS.TM.Loader.load(fn,1);
		},
		/**
		 * 给外部加载关键任务，需要立即执行的接口
		 * @param {Function} fn 需要被执行的任务
		 */
		fastLoad:function(fn){
			CPUJS.TM.Loader.load(fn,0);
		},
		/**
		 * 当关掉任务调度器的时候
		 * @param {Function} fn 需要被执行的任务
		 */
		loadAndRun:function(fn){
			if("function"==typeof(fn)){
				fn.apply(null,Array.prototype.slice.call(arguments,1));
			}else if(isArray(fn)){
				for(var i=0,len=fn.length;i<len;i++){
					if("function"==typeof(fn[i])){
						fn[i]();
					}
				}
			}
		},
		/**
		 * 任务调度器的总启动逻辑
		 */
		run:function(){
			var p = CPUJS.TM;
			if(p.lock){
				return;
			}
			p.lock = true;
			//根据当前cpu开销来动态调度任务
			CPUJS.Monitor.getCurrentCPU(function(per){
				if(!p.GearBox.lock){
					p.GearBox.lock = true;
				}
				//动态调整单任务cpu参数
				//更大程度利用cpu资源
				var freePer = (p.getMaxCPU()/100)-per,c;//剩余资源
				if(freePer>0&&!p.Shooter.lock){
					c = p.GearBox.getNum();//获取可以同时执行的任务数
					//CPUJS.log("do missions count:"+c);
					p.Shooter.lock = true;
					p.Shooter.exec(c);
				}
				//如果当前已经没有空余CPU资源了，则本次啥都不做，继续检测
				p.lock = false;
				var time = (per*100>p.getMaxCPU())?200:50;//如果当前已经很大开销了，则过一会再执行下一次调度
				if(!p.Loader.checkIsEmpty()){
					//CPUJS.log("has more missions!!!  num:"+p.fastQueue.length+p.normalQueue.length+p.asynCBQueue.length);
					setTimeout(p.run,time);//队列里面还有任务，继续执行
				}else{
					//clearInterval(CPUJS.Monitor.timerID);
					CPUJS.TM.Stat.show();
					return;
				}
			});
		},
		/**
		 * 获取CPU阀值
		 */
		getMaxCPU:function(){
			return CPUJS.Config.TM_MAX_CPU;//希望全局CPU开销尽量不超过的阀值
		},
		/**
		 * 任务调度器的重置
		 */
		reset:function(){
			var p = CPUJS.TM;
			p.mainQueue=p.fastQueue=p.normalQueue=p.asynCBQueue=[];
			p.GearBox.reset();
		},
	//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^任务加载部分^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
		/**
		 * 负责任务加载的模块
		 */
		Loader:{
			mainQueue:[],//主任务队列
			fastQueue:[],//优先队列，一般来说这个队列里面的任务享有最高优先级
			normalQueue:[],//普通队列，一般的业务逻辑任务都是往这里放的
			asynCBQueue:[],//异步回调队列，异步回调的任务都往这里插，他们享有比普通队列更高的优先级
			load:function(fn,type){
				var p = CPUJS.TM.Loader,map=["fastQueue","asynCBQueue","normalQueue"],queue = map[type];
				if(isArray(fn)){
					p[queue] = p[queue].concat(fn);
					CPUJS.Monitor.svr.add(fn.length);
				}
				if("function"==typeof(fn)){
					if(!fn.__args){
						p[queue].push(fn);
					}else{
						p[queue].push([fn,fn.__args]);
					}
					CPUJS.Monitor.svr.add();
				}
				if(CPUJS.TurnOff.TM){
					CPUJS.TM.Shooter.exec(0);//关掉任务调度器的时候直接马上执行全部任务
					return;
				}
				CPUJS.TM.run();//有任务进来的时候默认都启动一下任务调度器，任务调度器做完一批任务的时候如果发现队列里面还有任务可以执行，会继续执行，当发现任务全部执行完，会暂停工作，直至有新的任务进来时再启动
			},
			/**
			 * 检测是否已经没有任务需要处理
			 * @return {Boolean} 是否已经没有任务需要处理，true表示当前任务全部执行完毕
			 */
			checkIsEmpty:function(){
				var p = CPUJS.TM.Loader;
				return !(p.fastQueue.length>0||p.normalQueue.length>0||p.asynCBQueue.length>0);
			},
			/**
			 * 从几个任务队列里面取出一定数量的任务
			 * @param {Number} count 同时执行的任务数
			 */
			getTask:function(count){
				var p = CPUJS.TM.Loader,a=p.fastQueue,b=p.normalQueue,c=p.asynCBQueue,r=[];

				if(count==0){//表示需要把当前全部任务执行掉，这里要返回全部任务
					count = a.length+b.length+c.length;
				}
				while(a.length>0){//优先执行fastQueue里面的关键任务
					r.push(a.shift());
					if(r.length==count){
						return r;
					}
				}
				while(c.length>0){//再次执行异步的回调
					r.push(c.shift());
					if(r.length==count){
						return r;
					}
				}
				while(b.length>0){//最后执行普通任务
					r.push(b.shift());
					if(r.length==count){
						return r;
					}
				}
				return r;
			}
		},
	//vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv任务加载部分vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^任务处理部分^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
		/**
		 * 负责任务处理的模块
		 */
		Shooter:{
			exec1:function(count){
				var p = CPUJS.TM,fn,a,len,d1,d2,t1,t2,t3,_a=[],d=0,d0 = CPUJS.now();
				//a = p.Loader.getTask(count);//获取数量为count的一批任务
				while(d<CPUJS.Config.TM_MAX_CPU){
					console.log("ddddd:"+d+"    CPUJS.Config.TM_MAX_CPU:"+CPUJS.Config.TM_MAX_CPU);
					a = p.Loader.getTask(1);
					fn = a.shift();
					if(isArray(fn)){
						_a = fn[1];
						fn = fn[0];
					}
					if("function"==typeof(fn)){
						
						/*
						(function(ar){//这里不使用setTimeout的主要原因是要让几个任务同步执行，才能让cpu曲线即时有变化，才可以更好的做下一步的智能调度决策
							setTimeout(function(){
								fn.apply(null,ar);
								window.__c++;
								console.log(window.__c);
							},10);
						})(_a);
						*/
						if(!CPUJS.TurnOn.TryCatch){//调试模式下不走try catch
							fn.apply(null,_a);
						}else{
							try{//try catch如果没捕捉到出错其实基本上没开销；捕捉1000次有出错的才15ms开销
								fn.apply(null,_a);
							}catch(e){
								CPUJS.log(e);
							}
						}
						t2 = CPUJS.now();
						
						if(t3>CPUJS.Config.TM_MISSION_DELAY){
							p.Stat.log(fn.toString(),t3);//记录这个任务的执行时间
						}
						d=t2-d0;
						continue;
					}
					d+=30;
				}
				setTimeout(function(){
					CPUJS.TM.Shooter.lock = false;
				},50);
			},
			exec:function(count){
				var p = CPUJS.TM,fn,a,len,d1,d2,t1,t2,t3,_a=[];
				a = p.Loader.getTask(count);//获取数量为count的一批任务
				len = a.length;
				d1 = CPUJS.now();
				while(a.length>0){//优先执行fastQueue里面的关键任务
					fn = a.shift();
					if(isArray(fn)){
						_a = fn[1];
						fn = fn[0];
					}
					if("function"==typeof(fn)){
						t1 = CPUJS.now();
						/*
						(function(ar){//这里不使用setTimeout的主要原因是要让几个任务同步执行，才能让cpu曲线即时有变化，才可以更好的做下一步的智能调度决策
							setTimeout(function(){
								fn.apply(null,ar);
								window.__c++;
								console.log(window.__c);
							},10);
						})(_a);
						*/
						if(!CPUJS.TurnOn.TryCatch){//调试模式下不走try catch
							fn.apply(null,_a);
						}else{
							try{//try catch如果没捕捉到出错其实基本上没开销；捕捉1000次有出错的才15ms开销
								fn.apply(null,_a);
							}catch(e){
								CPUJS.log(e);
							}
						}
						t2 = CPUJS.now();
						t3 = t2-t1;
						if(t3>CPUJS.Config.TM_MISSION_DELAY){
							p.Stat.log(fn.toString(),t3);//记录这个任务的执行时间
						}
					}
					CPUJS.Monitor.svr.remove();
				}
				var d2 = CPUJS.now(),t = d2-d1;
				var cpuPer = t/50;
				CPUJS.Monitor.getCurrentCPU(function(per){
					cpuPer = Math.max(cpuPer,per);
					CPUJS.TM.GearBox.adjust(cpuPer);
				});
				setTimeout(function(){
					CPUJS.TM.Shooter.lock = false;
				},5);
			}
		},
	//vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv任务处理部分vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^任务统计部分^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
		/**
		 * 任务调度器执行过程中需要的各种数据统计逻辑
		 */
		Stat:{
			queue:[],
			log:function(fn,time){
				var p = CPUJS.TM.Stat,
					o = {
					'fn':fn,
					'time':time
				}
				p.queue.push(o);
			},
			show:function(){
				var p = CPUJS.TM.Stat,_a=["missionDelayStat:"],o;
				if(!p.queue.length){
					return;
				}
				while(p.queue.length>0){//优先执行fastQueue里面的关键任务
					o = p.queue.shift();
					_a.push("fn:"+o.fn+"   time:"+o.time);
					CPUJS.mark(o.time,"#F00","time:"+o.time+"\n\nfn:"+o.fn);
				}
				CPUJS.log(_a.join("\n"));
			}
		},
	//vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv任务统计部分vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^任务数调整部分^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
		/**
		 * 变速箱，用来动态调整任务调度器批量处理的任务数目
		 * 
		 */
		GearBox:{
			index_plus:1,
			index_minus:1,
			lock :false,
			num:1,
			step:2,
			statPool:[],
			STAT_POOL_MAX:100,
			currentCPUPer:0,
			meetErrorFlag:0,//遇到异常情况，减一处理，再观察，接下来如果遇到cpu任何变化都属于正常情况，再把这个标记位清掉
			/**
			 * 上一次增加或是减少的记录
			 * @type 
			 */
			lastChangeObj:{
				act:"plus",//上一次是增加或减少
				num:0,//上一次调整到的同时执行任务数
				per:0//上一次的全局CPU开销
			},
			/**
			 * 增加任务数
			 * @param {Number} currentCPUPer 当前的CPU开销，例如20 表示当前开销是20%
			 */
			plus:function(currentCPUPer){
				var p = CPUJS.TM.GearBox,
				currentCPUUsedPer = Math.round((currentCPUPer/CPUJS.TM.getMaxCPU())*100);
				if(currentCPUUsedPer<25){//0-%25走指数级增长
					p.index_plus++;
					p.num+=Math.pow(p.step,p.index_plus);
				}else if(currentCPUUsedPer<50){//25%-50%走指数增长，减一档
					var i = p.index_plus-1;
					if(i<0){
						i = 0;
					}
					p.num+=Math.pow(p.step,i);
				}else if(currentCPUUsedPer<100){//50%-100%走指数增长，减两档
					var i = p.index_plus-2;
					if(i<0){
						i = 0;
					}
					p.num+=Math.pow(p.step,i);
				}
				p.lock = false;
				p.currentCPUPer = currentCPUPer;
				p.lastChangeObj = {
					act:"plus",
					num:Math.floor(p.num),
					per:currentCPUPer
				}
			},
			/**
			 * 减少任务数
			 * @param {Number} currentCPUPer 当前的CPU开销，例如20 表示当前开销是20%
			 * @param {Boolean} isError，是否出现异常情况，是的话先减一点点
			 */
			minus:function(currentCPUPer,isError){
				var p = CPUJS.TM.GearBox,currentCPUUsedPer = Math.round((currentCPUPer/CPUJS.TM.getMaxCPU())*100);
				if(isError){
					p.num-=1;
				}else{
					if(currentCPUUsedPer>80){//当前cpu开销已经达到80%以上，非常危险，要大降
						p.num/=4;//直接减到4分之一			
					}else if(currentCPUUsedPer>50){//当前cpu处于50%-80%，中等程度危险
						p.num/=3;//直接减到2分之一
					}else{//当前cpu处于0%-50%，轻微程度危险
						p.num/=1.5;//直接减到1.1分之一
					}	
				}
				p.index_plus-=2;//plus 的减档，避免等下一下子加太多
				if(p.index_plus<0){
					p.index_plus = 0;
				}
				if(p.num<=0){
					p.num = 1;
				}
				p.lock = false;
				p.currentCPUPer = currentCPUPer;
				p.lastChangeObj = {
					act:"minus",
					num:Math.floor(p.num),
					per:currentCPUPer
				}
			},
			/**
			 * 获取任务数
			 * @param {Number} currentCPUPer 当前的CPU开销，例如20 表示当前开销是20%
			 * @return {Number} 
			 */
			getNum:function(){
				var p = CPUJS.TM.GearBox;
				p.num = Math.ceil(p.num);
				return p.num;
			},
			_nextMinus:false,//lock状态下，是不能马上调整的，但可以通过这个东西来告诉它下一次是不是需要减少
			/**
			 * 根据当前cpu开销来动态地调整任务个数
			 * @param {Number} per
			 */
			adjust:function(per){
				var p = CPUJS.TM.GearBox,_per = Math.round(per*100);
				if(p.lock){
					if(_per<CPUJS.TM.getMaxCPU()&&!p._nextMinus){
						p.plus(_per);
					}else{
						p.minus(_per);
						p._nextMinus = false;
					}
				}else{
					if(_per>=CPUJS.TM.getMaxCPU()){
						p._nextMinus = true;
					}
				}
			},
			/**
			 * 恢复初始状态
			 */
			reset:function(){
				var p = CPUJS.TM.GearBox;
				p.num = p.index_plus = p.index_minus = 1;
				p.lastChangeObj = {
					act:"plus",//上一次是增加或减少
					num:1,//上一次调整到的同时执行任务数
					per:0//上一次的全局CPU开销
				};
			}
		}
	//vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv任务数调整部分vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
	};
	CPUJS.bootstrap = function(){
		CPUJS.Monitor.init();
	};
	/**
	 * 抛给外部的接口
	 */
	exports.bootstrap = CPUJS.bootstrap;
	exports.load = CPUJS.TM.load;
	exports.fastLoad = CPUJS.TM.fastLoad;
	exports.Config = CPUJS.Config;
	exports.Monitor = CPUJS.Monitor;
	exports.TM = CPUJS.TM;
	exports.Stat = CPUJS.Monitor.Stat;
	exports.TurnOn = CPUJS.TurnOn;
	exports.TurnOff = CPUJS.TurnOff;
	exports.mark = CPUJS.mark;
	/**
	 * 环境配置
	 */
	CPUJS.setup = function(){
		var pre = "cpujs_", url = location.href.toLowerCase(), k;

		if(location.href.indexOf("cpujs_debugger")>-1){
			CPUJS.TurnOn.Log = true;
			CPUJS.TurnOn.Monitor = true;
			CPUJS.TurnOn.Stat = true;
			CPUJS.TurnOff.EnergySave = true;
		}
		//初始化开关
		for(k in CPUJS.TurnOn){
			if(url.indexOf((pre+k.toLowerCase()+"_on"))>-1){
				CPUJS.TurnOn[k] = true;
			}
		}
		for(k in CPUJS.TurnOff){
			if(url.indexOf((pre+k.toLowerCase()+"_off"))>-1){
				CPUJS.TurnOff[k] = true;
			}
		}
		if(CPUJS.TurnOff.FastLoad){//提供关闭CPU的fastload功能，方便对比两者之间的差异
			exports.fastLoad = CPUJS.TM.load;
		}
		if(CPUJS.TurnOn.ConsoleUI){//打开consoleUI也会打开CPUJS.log
			CPUJS.TurnOn.Log = true;
		}
		if(CPUJS.TurnOff.TM){
			exports.load = CPUJS.TM.loadAndRun;
			CPUJS.Monitor.resume();//让Monitor先动起来
		}
	};
	CPUJS.setup();
});