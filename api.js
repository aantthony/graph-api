(function () {

var host = "http://localhost";
var listening = false;
var graphs = {
	
};
function message (e) {
	if(e.origin !== host) {
		throw("Cross Domain Security Failure");
	}
	var msg = JSON.parse(e.data);
	console.warn('recv', msg);
	graphs[msg.id].receive(msg);
};
var sent = 0;
var Graph = function (domElement, options) {
	var iframe = document.createElement("iframe");
	var g = this;
	this.eventListeners = {};
	
	if(options.fadeIn !== false) {
		iframe.style.opacity = "0.0";
		iframe.style.webkitTransition = iframe.style.mozTransition = 'opacity 0.2s linear';
		this.once('ready', function(){
			iframe.style.opacity = '1.0';
		});
	}
	if (!domElement) {
		domElement = document.createElement('div');
		domElement.style.display = 'none';
		// Need to add it to the page so that the iframe is loaded.
		document.body.appendChild(domElement);
	}
	domElement.appendChild(iframe);
	this.send = function (msg) {
		console.warn('send', msg);
		iframe.contentWindow.postMessage(JSON.stringify(msg), host);
	};
	this.send.contentWindow = iframe.contentWindow;
	
	this._anim = [];
	this._animating = false;
	if(!listening) {
		window.addEventListener("message", message, false);
	}
	do {
		this.id = (0 | Math.random() * 100000000).toString(30);
	} while(graphs[this.id] !== undefined);
	this.constructor = {
		name: 'Graph.tk Instance #' + this.id
	};
	graphs[this.id] = this;
	iframe.onload = function(){
		g.send({
			init: {
				id: g.id,
				equations: options.equations || [],
				configure: {
					equations: false
				}
			}
		});
	};
	
	iframe.src = host + "/#api";
};

Graph.toString = function (){
	return "function Graph(domElement, options){\n    /*!\n     *  Graph.tk API\n     *  https://github.com/aantthony/graph-api\n     *  \n     *  Copyright 2012 Anthony Foster. All Rights Reserved.\n     */\n    [Graph.tk API]\n}";
}

var _Graph = window.Graph;
Graph.noConflict = function (){
	window.Graph = _Graph;
	return Graph;
};
Graph.cubic = function (t) {
	return t * t * (3 - 2 * t);
};
Graph.prototype.receive = function (msg){
	if (msg.event) {
		this.emit(msg.event, msg.data);
	}
};
Graph.prototype.removeListener = function (event, f) {
	var i = this.eventListeners[event].indexOf(f);
	this.eventListeners[event].splice(i, 1);
	return this;
};
Graph.prototype.removeAllListeners = function (event) {
	this.eventListeners[event] = undefined;
	return this;
};
Graph.prototype.once = function(event, f) {
	var f_ = function (){
		var ret = f.apply(this, arguments);
		this.removeListener(event, f);
		return ret;
	};
	if(this.eventListeners[event]) {
		this.eventListeners[event].push(f_);
	} else {
		this.eventListeners[event] = [f_];
	}
	return this;
};
Graph.prototype.on = function(event, f) {
	if(this.eventListeners[event]) {
		this.eventListeners[event].push(f);
	} else {
		this.eventListeners[event] = [f];
	}
	return this;
};
Graph.prototype.emit = function (event /*, arg1, arg2, arg3...*/) {
	if(this.eventListeners[event]){
		var i, l;
		for(i = 0, l = this.eventListeners[event].length; i < l; i++) {
			this.eventListeners[event][i].apply(this, Array.prototype.slice.call(arguments,1));
		}
	}
	return this;
};
Graph.prototype.lookAt = function(x, y){
	this.send({
		lookAt: [x, y]
	});
	return this;
};

Graph.prototype._animStep = function (){
	if (!this._anim.length) {
		this._animating = false;
		return;
	}
	var i, l;
	var t = new Date() / 1000;
	var afters = [];
	for(i = 0, l = this._anim.length; i < l; i++) {
		var f = this._anim[i]
		if(!f.t) {
			f.t = t;
		}
		if(f(t - f.t) === false){
			if(f.after) {
				afters.push(f.after);
			}
			this._anim.splice(i, 1);
			l--;
		}
	}
	for (i = 0, l = afters.length; i < l; i++) {
		afters[i]();
	}
	var self = this;
	setTimeout(function (){
		self._animStep()
	}, 1000 / 60);
};
Graph.prototype._startAnimation = function (){
	if (this._animating) {
		return;
	}
	this._animating = true;
	this._animStep();
};
Graph.prototype.animate = function (f, p){
	var f_ = f;
	var j =  Object.create(this);
	if (p !== false) {
		this._anim.push(f);
	}
	var self = this;
	j.animate = function (f_next) {
		//Animate after
		f_.after = function (){
			self.animate(f_next);
		}
		f_ = f_next;
		if (!this._animating){
			this._startAnimation();
		}
		return j;
	};
	j.then = function (then) {
		f_.after = then;
		return j;
	}
	if (!this._animating) {
		this._startAnimation();
	}
	return j;
};
Graph.prototype.allowUserInput = function (enabled) {
	this.send({
		allowUserInput: enabled === undefined ? true : enabled
	});
};
Graph.prototype.add = function(equation) {
	this.send({
		add: equation
	})
	return this;
};
Graph.prototype.destroy = function () {
	delete graphs[this.id];
	return null;
};
Graph.prototype.render = function (width, height, callback) {
	this.send({
		render: [width, height]
	});
	if (callback) {
		this.once('render', callback);
	}
	return this;
};
if (typeof module === 'undefined') {
    module.exports = Graph;
} else {
    // use a global varaible
    window['Graph'] = Graph;
}


}());