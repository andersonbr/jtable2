(function($) {

	var jTable2 = function(el, settings) {
		this.element = el;
		this.settings = {
			url : null,
			requestMethod : null,
			requestParameters : null,
			debug : null,
			callback : null,
			fields : [],
			lang: null,
			filtering: false,
			rootNode: null,
			totalPagesNode: null,
			currentPage: 0
		};
		this.initialize(settings);
	};

	/**
	 * log
	 * 
	 * @param msg
	 */
	jTable2.prototype.log = function(msg) {
		if (this.settings.debug) {
			jTable2.logger(msg);	
		}
	};

	/**
	 * initialize
	 */
	jTable2.prototype.initialize = function(settings) {
		this.setSettings(settings);
		var instance = this;
		var content = "<div class='jtable2'><div class='filterArea'></div><div class='resultArea'></div><div class='paginatingArea'></div></div>";
		$(this.element).html(content);
		if (this.settings.filtering) {
			var filterArea = $(this.element).find(".filterArea")[0];
			$(filterArea).append("<div class='filters'></div>");
			$(filterArea).append("<div class='filtersAdd'>"+
				jTable2.getMessage("add.filter", this.settings.lang)
				+"</div>");
			$(filterArea).append("<div class='filtersSearch'>"+
				jTable2.getMessage("search", this.settings.lang)
				+"</div>");
			var filtersAdd = $(this.element).find(".filterArea .filtersAdd")[0];
			var filtersSearch = $(this.element).find(".filterArea .filtersSearch")[0];
			$(filtersAdd).click(function() {
				instance.log("filtersAdd");
				var field = instance.getField("date");
				$(instance.element).find(".filterArea .filters").append(field.title+" <input class='textfilter' type='text' /><br />");
			});
			$(filtersSearch).click(function() {
				instance.load();
			});
			$(filterArea).show();
		}
	};
	
	/**
	 * get field
	 */
	jTable2.prototype.getField = function(field) {
		for (var i = 0; i < this.settings.fields.length; i++) {
			if (this.settings.fields[i].field == field) {
				return this.settings.fields[i];
			}
		}
		return null;
	};

	/**
	 * set settings
	 */
	jTable2.prototype.setSettings = function(settings) {
		if (typeof settings != "undefined" && settings != null) {
			if (settings.debug) {
				this.log("Initializing jTable2");
			}
			for ( var p in this.settings) {
				if (typeof settings[p] != "undefined") {
					this.settings[p] = settings[p];
				}
			}
			if (typeof settings.url != "undefined") {
				this.log("New URL: " + this.settings.url);
			}
		}
	};

	/**
	 * request
	 */
	jTable2.prototype.load = function() {
		var instance = this;
		$.ajax({
			type : this.settings.requestMethod,
			url : this.settings.url,
			data : this.settings.requestParameters,
			success : function(json) {
				instance.processResult(json);
				if (instance.settings.callback != null && typeof instance.settings.callback == "function") {
					instance.settings.callback();
				}
			},
			error : function(XMLHttpRequest, textStatus, errorThrown) {
				instance.log("error");
			}
		});
	};

	/**
	 * process result
	 */
	jTable2.prototype.processResult = function(json) {
		var instance = this;
		/**
		 * build table
		 */
		var root = json[this.settings.rootNode];
		var total = json[this.settings.totalPagesNode];
		if (typeof root != "undefined") {
			var content = "<table>";
			content += "<thead><tr>";
			for (var i = 0; i < this.settings.fields.length; i++) {
				var fieldInfo = this.settings.fields[i];
				content += "<th>";
				content += fieldInfo.title;
				content += "</th>";
			}
			content += "</tr></thead>";
			content += "<tbody>";
			var odd = true;
			for (var i = 0; i < root.length; i++) {
				var tuple = root[i];
				content += "<tr class='"+(odd?"odd":"even")+"'>";
				for (var x = 0; x < this.settings.fields.length; x++) {
					var fieldInfo = this.settings.fields[x];
					var converter = fieldInfo["converter"];
					var v = tuple[fieldInfo.field];
					if (typeof converter != "undefined") {
						v = converter(v);
					}
					var s = [];
					for (var st in fieldInfo.style) {
						s.push(st+": "+fieldInfo.style[st]);
					}
					content += "<td style='"+s.join(";")+"'>"+v+"</td>";
				}
				content += "</tr>";
				odd = (odd)?false:true;
			}
			content += "</tbody>";
			content += "</table>";
			$(this.element).find(".resultArea").html(content);
			$(instance.element).find(".resultArea").css('height', '300px');
			//$(instance.element).find(".resultArea").fadeIn('normal');
			
			$(this.element).find(".resultArea table thead th").click(function(){
				$(instance.element).find(".resultArea table thead th").each(function (i, e) {
					$(e).removeClass("selected");
				});
				$(this).addClass("selected");
			});
			this.log(root);
			this.log(total);

			$(instance.element).find(".paginatingArea").fadeIn('fast');
		} else {
			this.log("fatal: root node not found ("+this.settings.rootNode+")");
		}
	};

	/**
	 * array of instances
	 */
	jTable2.instances = [];

	/**
	 * internationalization
	 */
	jTable2.messages = {
		"empty.table": {
			"en": "Empty table",
			"pt": "Tabela vazia"
		},
		"not.loaded": {
			"en": "Not loaded data",
			"pt": "Dados não carregados"
		},
		"add.filter": {
			"en": "Add filter",
			"pt": "Adicionar filtro"
		},
		"search": {
			"en": "Search",
			"pt": "Buscar"
		},
		"inverval": {
			"en": "Interval",
			"pt": "Intervalo"
		}
	};
	jTable2.getMessage = function(key, lang) {
		var l = (typeof lang != "undefined" && lang != null) ? lang : ((navigator.language) ? navigator.language : navigator.userLanguage);
		l = l.split("-")[0];
		var msg = typeof jTable2.messages[key][lang] != "undefined" ? jTable2.messages[key][l] : jTable2.messages[key]["en"];
		return msg;
	};

	/**
	 * get instance by element
	 * 
	 * @param el
	 */
	jTable2.getInstance = function(el) {
		for ( var i = 0; i < jTable2.instances.length; i++) {
			var instance = jTable2.instances[i];
			var instanceEl = instance.element;
			if (el == instanceEl) {
				return instance;
			}
		}
		return null;
	};

	/**
	 * logger to browser console
	 * 
	 * @param msg
	 */
	jTable2.logger = function(msg) {
		if (typeof console != "undefined"
				&& typeof console.debug != "undefined") {
			console.debug(msg);
		}
	};

	$.fn.jTable2 = function(settings) {

		/**
		 * default settings
		 */
		var defaultSettings = {
			debug : false,
			maxPagesViewed : 15,
			requestMethod : "POST",
			rootNode: "list",
			totalPagesNode: "total"
		};
		if (typeof settings == "undefined") {
			settings = {};
		}

		/**
		 * external methods
		 */
		$.fn.extend({
			load : function() {
				/**
				 * refresh selector matched instances
				 */
				for ( var i = 0; i < this.length; i++) {
					jTable2.getInstance(this[i]).load();
				}
			},
			getSettings : function() {
				/**
				 * get settings for first match
				 */
				return jTable2.getInstance(this[0]).settings;
			},
			getSetting : function(setting) {
				/**
				 * get some setting for first match
				 */
				return jTable2.getInstance(this[0]).settings[setting];
			},
			getInstance : function() {
				/**
				 * get instance of first match
				 */
				return jTable2.getInstance(this[0]);
			},
			getInstances : function() {
				return jTable2.instances;
			},
			setPage : function(page) {
				/**
				 * set page matched instances
				 */
				for ( var i = 0; i < this.length; i++) {
					jTable2.getInstance(this[i]).setSettings({currentPage: page});
				}
			}
		});

		/**
		 * initializing
		 */
		$(this).each(function(i, e) {
			var instance = jTable2.getInstance(e);
			/**
			 * compile settings
			 */

			var compiledSettings = settings;
			for ( var v in defaultSettings) {
				if (typeof compiledSettings[v] == "undefined") {
					compiledSettings[v] = defaultSettings[v];
				}
			}

			/**
			 * create new instance to this element, if not exist
			 */
			if (instance == null) {
				instance = new jTable2(e, compiledSettings);
				jTable2.instances.push(instance);
			} else {
				instance.setSettings(compiledSettings);
			}
		});
	};
})(jQuery);