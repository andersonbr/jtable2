(function($) {

	var jTable2 = function(el, settings) {
		this.element = el;
		this.settings = {
			title : null,
			url : null,
			requestMethod : null,
			requestParameters : null,
			debug : null,
			callback : null,
			fields : {},
			lang : null,
			filtering : false,
			rootNode : null,
			totalPagesNode : null,
			currentPage : null,
			maxPerPage : null,
			pagesParameters : null
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
		var content = "<div class='jtable2'>";
		content += "<div class='tableTitle'></div>";
		content += "<div class='filterArea'></div>";
		content += "<div class='resultArea'></div>";
		content += "<div class='paginatingArea'></div>";
		content += "</div>";
		$(this.element).html(content);
		$(this.element).find(".tableTitle").html(this.settings.title);
		if (this.settings.filtering) {
			var filterArea = $(this.element).find(".filterArea")[0];

			$(filterArea).append("<div class='filters'></div>");

			$(filterArea).append(
					"<div class='filtersAdd'>"
							+ jTable2.getMessage("add.filter",
									this.settings.lang) + "</div>");

			$(filterArea).append(
					"<div class='filtersSearch'>"
							+ jTable2.getMessage("search", this.settings.lang)
							+ "</div>");

			/**
			 * add filters button
			 */
			var filtersAdd = $(this.element).find(".filterArea .filtersAdd")[0];
			var filtersSearch = $(this.element).find(
					".filterArea .filtersSearch")[0];
			$(filtersAdd)
					.click(
							function() {
								instance.log("filtersAdd");
								var field = instance.getField("dataHora");
								$(instance.element)
										.find(".filterArea .filters")
										.append(
												field.title
														+ " <input class='textfilter' type='text' /><br />");
							});
			$(filtersSearch).click(function() {
				instance.load();
			});
			$(filterArea).show();
		}
	};

	/**
	 * get field (column) information
	 */
	jTable2.prototype.getField = function(field) {
		for ( var f in this.settings.fields) {
			if (f == field) {
				return this.settings.fields[f];
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
		var req = this.settings.requestParameters;
		var pages = {};
		pages[this.settings.pagesParameters["currentPage"]] = this.settings.currentPage;
		pages[this.settings.pagesParameters["maxPerPage"]] = this.settings.maxPerPage;
		req = jTable2.mergeObjects(req, pages);
		$.ajax({
			type : this.settings.requestMethod,
			url : this.settings.url,
			data : req,
			success : function(json) {
				instance.processResult(json);
				if (instance.settings.callback != null
						&& typeof instance.settings.callback == "function") {
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

			/**
			 * head
			 */
			content += "<thead><tr>";
			for ( var f in this.settings.fields) {
				var fieldInfo = this.settings.fields[f];
				content += "<th><div class='columnTitle'>";
				content += fieldInfo.title;
				content += "<div class='icon'></div></div></th>";
			}
			content += "</tr></thead>";

			/**
			 * body
			 */
			content += "<tbody>";
			var odd = true;
			for ( var i = 0; i < root.length; i++) {
				var tuple = root[i];
				content += "<tr class='" + (odd ? "odd" : "even") + "'>";
				for ( var f in this.settings.fields) {
					var fieldInfo = this.settings.fields[f];
					/**
					 * value for column f
					 */
					var fieldVal = jTable2.getNodeField(tuple, f) || "";
					/**
					 * type of column
					 */
					var type = fieldInfo["type"] || null;
					/**
					 * formatter of column (for date or number)
					 */
					var format = fieldInfo["format"] || null;
					/**
					 * converter for value (if defined converter, this will be
					 * used)
					 */
					var maxLen = fieldInfo["maxLen"] || 0;
					var converter = fieldInfo["converter"]
							|| function(val) {
								if (val.length != 0) {
									var res = null;
									switch (type) {
									case "date":
										res = (format != null) ? moment(
												new Date(val)).format(format)
												: new Date(val);
										break;

									default:
										res = val;
										if (maxLen > 0 && val.length > maxLen) {
											res = val.substring(0, maxLen)
													+ "...";
										}
										break;
									}
									return res;
								} else {
									return val;
								}
							};
					fieldVal = converter(fieldVal);
					var s = [];
					for ( var st in fieldInfo.style) {
						s.push(st + ": " + fieldInfo.style[st]);
					}
					content += "<td style='" + s.join(";") + "'>" + fieldVal
							+ "</td>";
				}
				content += "</tr>";
				odd = (odd) ? false : true;
			}
			content += "</tbody>";
			content += "</table>";
			/**
			 * insert result table
			 */
			$(this.element).find(".resultArea").html(content);

			/**
			 * add column order controls
			 */
			$(this.element)
					.find(".resultArea table thead th")
					.click(
							function() {
								var asc = ($(this).find(
										".icon.ui-icon-triangle-1-s").length == 1 || $(
										this).find(".icon").length == 0);
								$(instance.element).find(
										".resultArea table thead th").each(
										function(i, e) {
											$(e).removeClass();
											var icon = $(e).find(".icon");
											icon.removeClass();
											icon.addClass("icon");
										});
								$(this).addClass("selected");
								$(this).find(".icon").addClass("selectedIcon");
								$(this).find(".icon").addClass("ui-icon");
								$(this).find(".icon").addClass(
										"ui-icon-triangle-1-"
												+ (asc ? "n" : "s"));
							});

			/**
			 * paginating
			 */
			content = "<ul class='pager'>";
			for ( var i = 0; i < total; i++) {
				content += "<li><a href='javascript:;' rel='" + i + "'>"
						+ (i + 1) + "</a></li>";
			}
			content += "</ul>";
			$(instance.element).find(".paginatingArea").html(content);
			var pagerButtons = $(instance.element).find(
					".paginatingArea ul.pager li");
			for ( var i = 0; i < pagerButtons.length; i++) {
				$(pagerButtons[i]).click(function() {
					var page = $(this).find("a").attr('rel');
					instance.settings.currentPage = page;
					instance.load();
					return false;
				});
			}

			$(instance.element).find(".paginatingArea").fadeIn('fast');
		} else {
			this.log("fatal: root node not found (" + this.settings.rootNode
					+ ")");
		}
	};

	/**
	 * array of instances
	 */
	jTable2.instances = [];

	/**
	 * internationalization
	 */
	jTable2.defaultLang = "en";
	jTable2.messages = {
		"empty.table" : {
			"en" : "Empty table",
			"pt" : "Tabela vazia"
		},
		"not.loaded" : {
			"en" : "Not loaded data",
			"pt" : "Dados não carregados"
		},
		"add.filter" : {
			"en" : "Add filter",
			"pt" : "Adicionar filtro"
		},
		"search" : {
			"en" : "Search",
			"pt" : "Buscar"
		},
		"inverval" : {
			"en" : "Interval",
			"pt" : "Intervalo"
		}
	};

	/**
	 * get message in selected or default language
	 * 
	 * @param key
	 * @param lang
	 * @returns
	 */
	jTable2.getMessage = function(key, lang) {
		var l = (typeof lang != "undefined" && lang != null) ? lang
				: ((navigator.language) ? navigator.language
						: navigator.userLanguage);
		l = l.split("-")[0];
		var msg = typeof jTable2.messages[key][lang] != "undefined" ? jTable2.messages[key][l]
				: jTable2.messages[key][jTable2.defaultLang];
		return msg;
	};

	/**
	 * merge two objects
	 * 
	 * @param o1
	 * @param o2
	 * @returns merged object
	 */
	jTable2.mergeObjects = function(o1, o2) {
		var o3 = {};
		for ( var attrname in o1) {
			o3[attrname] = o1[attrname];
		}
		for ( var attrname in o2) {
			o3[attrname] = o2[attrname];
		}
		return o3;
	};

	/**
	 * get node of tuple element: for t.user.name, call function(t, "user.name")
	 * 
	 * @param node
	 * @param field
	 * @returns
	 */
	jTable2.getNodeField = function(node, field) {
		if (typeof node == "undefined" || node == null)
			return null;
		var path = field.split(".");
		var res = node[path[0]];
		for ( var i = 1; i < path.length; i++) {
			if (res != null && res != "undefined"
					&& typeof res[path[i]] != "undefined")
				res = res[path[i]];
			else
				return "";
		}
		if (typeof res == "undefined")
			res = "";
		return res;
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
			rootNode : "list",
			totalPagesNode : "total",
			currentPage : 0,
			maxPerPage : 10,
			pagesParameters : {
				currentPage : "currentPage",
				maxPerPage : "maxPerPage"
			}
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
					jTable2.getInstance(this[i]).setSettings({
						currentPage : page
					});
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