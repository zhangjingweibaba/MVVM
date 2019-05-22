//观察者 (发布订阅)  观察者 被观察者
class Dep{
    constructor(){
        this.subs = [];//存放所有的watcher
    }
    //订阅
    addSub(watcher){ //添加watcher
        this.subs.push(watcher)
    }
    //发布
    notify(){
        this.subs.forEach(watcher=>watcher.update());
    }
}
class Watcher{//观察者
    constructor(vm,expr,cb){
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        //默认存放一个老值
        this.oldValue = this.get();
    }
    get(){
        Dep.target = this; //现在自己放在this上  取值 把这个观察者 和数据关联起来
        let value = CompileUtil.getVal(this.vm,this.expr);
        Dep.target = null; //不取消  任何值取值 都会添加watcher
        // console.log(value)
        return value;
    }
    update(){ //更新操作  数据变化后  会调用观察者的update方法
        let newValue = CompileUtil.getVal(this.vm,this.expr);
        // console.log(newValue)
        if(newValue !== this.oldValue){
            this.cb(newValue);
        }
    }
}
class Observer{ //实现数据劫持功能
    constructor(data){
        // console.log(data)
        this.observer(data);
    }
    observer(data){
        //如果是对象才会监视
        if(data && typeof data == 'object'){
            //如果是对象
            for(let key in data){
                this.defineReactive(data,key,data[key]);
            }
        }
    }
    defineReactive(obj,key,value){
        this.observer(value);
        let dep = new Dep();//给每一个属性 都加上一个具有发布订阅的功能
        Object.defineProperty(obj,key,{
            get(){
                //创建watcher是 会去到对应的内容 并且把watcher方法放到了全局上
                Dep.target && dep.addSub(Dep.target);
                return value;
            },
            set:newValue=>{
                if(newValue != value){
                    this.observer(newValue);
                    value = newValue;
                    dep.notify();            
                }
            }
        })
    }
}
class Compiler{
    constructor(el,vm){
        //判断el属性  是不是一个元素  如果不是元素  那就获取他
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        //把当前节点的元素 获取到  放到内存中
        let fragment = this.node2fragment(this.el);
        // 把节点中的内容进行替换


        //编译末班 用数据编译
        this.compiler(fragment);



        //把内容塞到页面中
        this.el.appendChild(fragment);
    }  
    //判断是否包含v-
    isDirectie(attrName){
        return attrName.startsWith('v-');
    }
    //编译元素的
    compilerElment(node){
        let attributes = node.attributes;//类数组
        [...attributes].forEach(attr=>{
            let {name,value:express} = attr;//type="text" v-model="school.name"
            //判断是不是指令
            if(this.isDirectie(name)){ //v-model v-html v-bind
                // console.log(node)
                let [,directive] = name.split('-');
                let [directiveName,eventName] = directive.split(':');
                //需要调用不同的函数来处理
                CompileUtil[directiveName](node,express,this.vm,eventName);
            }
        })
    }
    //编译文本的
    compilerText(node){//判断当前文本节点中的内容是否包含{{}}
        let content = node.textContent;
        if(/\{\{(.+?)\}\}/.test(content)){
            // console.log(content) //找到所有的文本
            // console.log(node)
            CompileUtil['text'](node,content,this.vm);
        }
    }
    //核心的编译方法 
    compiler(node){//用来编译内存中的dom节点
        let childNodes = node.childNodes;
        // console.log(childNodes)
        [...childNodes].forEach(child=>{
            if(this.isElementNode(child)){
                // console.log('element',child)
                this.compilerElment(child);
                //如果是元素的的话  需要把自己传进去  再去遍历子节点
                this.compiler(child);
            }else{
                // console.log('text',child)
                this.compilerText(child);
            }
        })
    }
    //把节点放到内存中
    node2fragment(node){
        //创建一个文档碎片
        let fragment = document.createDocumentFragment();
        // console.log(fragment)
        let firstChild;
        while(firstChild = node.firstChild){
            // console.log(firstChild)
            fragment.appendChild(firstChild);
        }
        return fragment;
    }
    //判断是否是元素节点
    isElementNode(node){
        return node.nodeType === 1;
    }
}
CompileUtil = {
    getVal(vm,expr){  //vm.$data 'school.name'
        // console.log(expr)
        // console.log(vm.$data)
        // console.log(expr.split('.'))
        // let arr = expr.split('.');
        // if(arr.length === 1){
        //     return vm.$data[expr];
        // }
        return expr.split('.').reduce((data,current)=>{
            // console.log(data)
            // console.log(current)
            return data[current];
        },vm.$data);
    },
    setValue(vm,expr,value){//
        expr.split('.').reduce((data,current,index,arr)=>{
            if(arr.length - 1 == index){
                return data[current] = value;
            }
            return data[current];
        },vm.$data);
    },
    //解析v-model这个指令
    model(node,expr,vm){ //node是节点  expr是表达式  vm是当前实例scholl.name vm.$data
        //给输入框富裕value属性 node.value == xxx
        let fn = this.updater['modelUpdater'];
        new Watcher(vm,expr,(newVal)=>{ //给输入框加一个观察者 如果稍后数据更新了会触发此方法，会拿新值  给输入框赋予值
            fn(node,newVal);
        })
        node.addEventListener('input',(e)=>{
            let value = e.target.value;//获取输入的内容
            // console.log(value)
            this.setValue(vm,expr,value);
        })
        let value = this.getVal(vm,expr);
        // console.log(value)
        fn(node,value);
    },
    html(node,expr,vm){
         //给输入框富裕value属性 node.value == xxx
        let fn = this.updater['htmlUpdater'];
        new Watcher(vm,expr,(newVal)=>{ //给输入框加一个观察者 如果稍后数据更新了会触发此方法，会拿新值  给输入框赋予值
            fn(node,newVal);
        })
        let value = this.getVal(vm,expr);
        // console.log(value)
        fn(node,value);
    },
    getContentValue(vm,expr){
        //遍历表达式  将内容重新替换成一个完整的内容返还回去
        return expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{
            // console.log(args)
            return this.getVal(vm,args[1]);
        })
    },
    on(node,expr,vm,eventName){
        node.addEventListener(eventName,(e)=>{
            vm[expr].call(vm,e)
        })
    },
    text(node,expr,vm){ //expr{{a}} {{b}}
        let fn = this.updater['textUpdater'];
        // // console.log(expr)
        let content = expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{
            // console.log(args)
            new Watcher(vm,args[1],()=>{//给表达式每{{}}都加上观察者
                fn(node,this.getContentValue(vm,expr));//返回了一个全的字符串
            })
            return this.getVal(vm,args[1]);
        });
        // // console.log(content)
        fn(node,content);
    },
    updater:{
        //巴蜀插入到节点中
        modelUpdater(node,value){
            node.value = value;
        },
        htmlUpdater(node,value){ //xss攻击
            node.innerHTML = value;
        },
        //处理文本节点
        textUpdater(node,value){
            node.textContent = value;
        }
    }
}
class Vue{
    constructor(options){
        this.$el = options.el;//根元素
        this.$data = options.data;//一些的属性
        let computed = options.computed;
        let methods = options.methods;
        if(this.$el){
            //把数据 全部装换成用Object.defineProperty来定义
            new Observer(this.$data);

            

            for(let key in computed){ //有依赖关系
                Object.defineProperty(this.$data,key,{
                    get:()=>{
                        // console.log(computed[key].call(this))
                        return computed[key].call(this);
                    }
                })
            }

            for(let key in methods){
                Object.defineProperty(this,key,{
                    get(){
                        return methods[key];
                    }
                })
            }




            //把数据获取操作  vm上的取值操作 到代理到vm.$data
            this.proxyVm(this.$data);


            new Compiler(this.$el,this)
        }
    }
    proxyVm(data){
        for(let key in data){
            Object.defineProperty(this,key,{//实现可以通过vm取到对应的内容
                get(){
                    return data[key];
                },
                set(newValue){//设置代理方法
                    data[key] = newValue;
                }
            })
        }
    }
}