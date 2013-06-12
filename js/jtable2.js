(function($) {
	/**
	 * define native methods
	 */
	if (!Object.keys) {
		Object.keys = function(obj) {
			var keys = [], k;
			for (k in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, k)) {
					keys.push(k);
				}
			}
			return keys;
		};
	}
	/***************************************************************************
	 * jTable2 class to instantiate for each matched div
	 */
	var jTable2 = function(el, settings) {
		this.element = el;
		this.requestLockeded = false;
		this.settings = {
			title : null,
			url : null,
			requestMethod : null,
			requestParameters : null,
			debug : null,
			callback : null,
			filterBean : null,
			filterIntervalBean : null,
			fields : {},
			idField : null,
			defaultAction : null,
			actions : null,
			multipleActions : null,
			lang : null,
			filtering : false,
			enumerate : false,
			rootNode : null,
			maxPagesViewed : null,
			totalPagesNode : null,
			currentPage : null,
			maxPerPage : null,
			pagesParameters : null
		};
		this.loaderTimeout = null;
		this.filterDialog = null;
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
		content += "<div class='resultArea'><div class='loader'></div><div class='tableContainer'></div></div>";
		content += "<div class='paginatingArea'></div>";
		content += "</div>";
		$(this.element).html(content);
		/**
		 * define jquery ui style
		 */
		$(this.element).find(".tableTitle").addClass("ui-widget-header");
		$(this.element).find(".tableTitle").html(this.settings.title);
		if (this.settings.filtering) {

			var filterArea = $(this.element).find(".filterArea")[0];

			$(filterArea)
					.append(
							"<div class='filters'><table style='border-spacing: 0px'></table></div>");

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
			$(filtersAdd).click(function() {
				instance.addFilterClick();
			});
			$(filtersSearch).click(function() {
				instance.load();
			});
			$(filterArea).show();
		}

		/**
		 * keydown to pass pages
		 */
		$(instance.element).attr("tabindex", 1);
		$(instance.element)
				.bind(
						"keydown",
						function(event) {
							// TODO: ctrl+ shift+
							if (!$(event.target).hasClass("filter")) {
								var current = 38;
								var inc = event.keyCode - current;
								if (inc == 1 || inc == -1) {
									var newPage = (instance.settings.currentPage + inc);
									if (newPage >= 0
											&& newPage < instance.settings.totalPages) {

										/**
										 * go to new page
										 */
										instance.goToPage(newPage);
									}
								}
							}
						});
	};

	jTable2.prototype.getFilterDialog = function() {
		if (this.filterDialog == null) {
			$(this.element).append(
					"<div class='filtersDialog' style='display: none'></div>");
			var dialogDiv = $(this.element).find(".filtersDialog");
			this.filterDialog = $(dialogDiv).dialog({
				title : jTable2.getMessage("add.filter", this.settings.lang),
				modal : true,
				closeOnEscape : true
			});
		}
		;
	};

	jTable2.prototype.addFilterClick = function() {
		var instance = this;
		this.log("filtersAdd");

		this.getFilterDialog();

		/**
		 * dialog content
		 */
		var addedCount = 0;
		this.filterDialog.text("");
		for ( var f in this.settings.fields) {
			var fieldInfo = this.settings.fields[f];
			var el = $(this.element).find(
					".filterArea .filters input[name='" + f + "']");
			if (el.length == 0) {
				this.filterDialog
						.append(" <input type='checkbox' checked='checked' value='"
								+ f + "' /> " + fieldInfo.title + "<br />");
				addedCount++;
			}
			;
		}
		if (addedCount == 0) {
			this.filterDialog.append(jTable2.getMessage("filters.unavaliable",
					this.settings.lang)
					+ "<br />");
		}
		;
		/**
		 * buttons
		 */
		var dialogButtons = {};
		if (addedCount > 0) {
			dialogButtons[jTable2.getMessage("add.filters", this.settings.lang)] = function() {
				instance.filterDialog
						.find("input[type=checkbox]:checked")
						.each(
								function(i, e) {
									var fieldInfo = instance.settings.fields[e.value];
									var numericfilter = "<tr><td>"
											+ fieldInfo.title
											+ "</td><td class='first' colspan=2><input class='filter numericfilter single' name='"
											+ e.value
											+ "' type='text' /><div class='icon inline'><div class='interval ui-icon "
											+ "ui-icon-carat-2-e-w'></div></div></td>"
											+ "<td class='second' style='display: none'><input class='filter numericfilter' name='"
											+ e.value
											+ "' type='text' /></td>"
											+ "<td><div class='icon'><div class='ui-icon "
											+ "ui-icon-trash delete'></div></div></td>"
											+ "</tr>";
									var textfilter = "<tr><td>"
											+ fieldInfo.title
											+ "</td><td colspan='2'><input class='filter textfilter' name='"
											+ e.value
											+ "' type='text' /></td>"
											+ "<td><div class='icon'><div class='ui-icon "
											+ "ui-icon-trash delete'></div></div></td>"
											+ "</tr>";
									/**
									 * adding filter field
									 */
									var tableel = $(instance.element).find(
											".filterArea .filters table");

									if (fieldInfo.type == "datetime"
											|| fieldInfo.type == "date"
											|| fieldInfo.type == "numeric") {
										tableel.append(numericfilter);
									} else {
										tableel.append(textfilter);
									}
									var el = $(instance.element).find(
											".filterArea .filters input[name='"
													+ e.value + "']");

									if (fieldInfo.type == "datetime") {
										var dateFormat = fieldInfo.format
												.split(" ")[0]
												|| "mm/dd/yy";
										var timeFormat = fieldInfo.format
												.split(" ")[1]
												|| "HH:mm:ss";
										el.datetimepicker({
											dateFormat : dateFormat,
											timeFormat : timeFormat
										});
										el
												.datetimepicker(
														"option",
														$.datepicker.regional[instance.settings.lang]);
										el
												.datetimepicker(
														"option",
														$.timepicker.regional[instance.settings.lang]);
									} else if (fieldInfo.type == "date") {
										var dateFormat = fieldInfo.format
												.split(" ")[0]
												|| "mm/dd/yy";
										el.datepicker({
											dateFormat : dateFormat
										});
										el
												.datepicker(
														"option",
														$.datepicker.regional[instance.settings.lang]);
									} else if (fieldInfo.type == "numeric") {
										el
												.attr("onkeypress",
														"return event.charCode >= 48 && event.charCode <= 57");
									}
								});
				/**
				 * remove interval and delete click events
				 */
				$(instance.element).find(".filterArea .filters .interval")
						.parent().unbind('click');

				$(instance.element).find(".filterArea .filters .delete")
						.parent().unbind('click');
				/**
				 * add interval and delete click events
				 */

				$(instance.element)
						.find(".filterArea .filters .interval")
						.parent()
						.click(
								function() {
									var currentLine = $(this).parent().parent();
									var secondTd = currentLine.find(".second");
									var visible = (secondTd.css("display") != "none");
									if (!visible) {
										secondTd.show();
										currentLine.find("td.first").attr(
												"colspan", 1);
										currentLine.find("td.first input")
												.removeClass("single");
									} else {
										secondTd.hide();
										currentLine.find("td.first").attr(
												"colspan", 2);
										currentLine.find("td.first input")
												.addClass("single");
										currentLine.find("td input").last()
												.val("");
									}
								});
				$(instance.element).find(".filterArea .filters .delete")
						.parent().click(function() {
							$(this).parent().parent().remove();
						});
				$(this).dialog("close");
			};
		}
		dialogButtons[jTable2.getMessage("cancel", this.settings.lang)] = function() {
			$(this).dialog("close");
		};
		this.filterDialog.dialog("option", "buttons", dialogButtons);

		/**
		 * open dialog
		 */
		this.filterDialog.dialog('open');
	};

	/**
	 * go to new page
	 */
	jTable2.prototype.goToPage = function(page) {
		if (!this.isRequestLocked()) {
			/**
			 * change page
			 */
			this.settings.currentPage = page;

			/**
			 * reload page
			 */
			this.load();
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
	jTable2.prototype.isRequestLocked = function() {
		return this.requestLocked;
	};

	jTable2.prototype.requestLock = function() {
		this.requestLocked = true;
		$(this.element).find(".resultArea").css("minHeight", 102);
		if (this.loaderTimeout == null) {
			var loader = $(this.element).find(".resultArea .loader");
			loader.html("<div class='center'></div>");
			/** canvas loader library */
			var cl = new CanvasLoader(loader.find(".center"), {
				id : 'jtable2Loader'
			});
			cl.setColor('#999999'); // default is '#000000'
			cl.setDiameter(44); // default is 40
			cl.setDensity(50); // default is 40
			cl.setRange(1); // default is 1.3
			cl.setSpeed(5); // default is 2
			cl.setFPS(20); // default is 24
			cl.show(); // Hidden by default
			loader.show();
		} else {
			clearTimeout(this.loaderTimeout);
		}

		$(this.element).find(".resultArea").show();
	};

	jTable2.prototype.requestUnlock = function() {
		var instance = this;
		instance.requestLocked = false;
		this.loaderTimeout = setTimeout(function() {
			instance.loaderTimeout = null;
			$(instance.element).find(".resultArea .loader").hide();
			$(instance.element).find(".resultArea .loader .center").remove();
		}, (this.settings.debug == true) ? 1000 : 200);
	};

	jTable2.prototype.load = function() {
		var instance = this;
		if (!this.isRequestLocked()) {
			this.requestLock();
			var req = this.settings.requestParameters;

			/**
			 * filter
			 */
			var filters = {};
			var numFilters = 0;
			$(".filters tr")
					.each(
							function(i, e) {
								var filterLine = $(e).find(".filter");
								var filterBean = instance.settings.filterBean;
								var filterIntervalBean = instance.settings.filterIntervalBean;

								var fieldFilter = filterLine[0].name;
								var fieldSettings = instance.settings.fields[fieldFilter];
								var fieldFilterVal = $(filterLine[0]).val();
								var fieldFilterIntervalVal = (filterLine.length > 1) ? $(
										filterLine[1]).val()
										: "";
								if (fieldSettings.type) {
									switch (fieldSettings.type) {
									case "date":
										fieldFilterVal = $(filterLine[0])
												.datepicker('getDate');
										if (fieldFilterIntervalVal.length > 0) {
											fieldFilterIntervalVal = $(
													filterLine[1]).datepicker(
													'getDate');
										}
										break;
									case "datetime":
										fieldFilterVal = $(filterLine[0])
												.datetimepicker('getDate');
										if (fieldFilterIntervalVal.length > 0) {
											fieldFilterIntervalVal = $(
													filterLine[1])
													.datetimepicker('getDate');
										}
										break;
									default:
										break;
									}
								}
								var definedFilter = (fieldFilterVal != null
										&& filterLine.length > 0 && ((!isNaN(fieldFilterVal) && fieldFilterVal != "") || fieldFilterVal.length > 0));
								var definedConverterField = (fieldSettings.requestConverter && definedFilter);
								var definedIntervalFilter = (fieldFilterIntervalVal != null
										&& filterLine.length > 1 && ((!isNaN(fieldFilterIntervalVal) && fieldFilterIntervalVal != "") || fieldFilterIntervalVal.length > 0));
								var definedConverterIntervalField = (fieldSettings.requestConverter && definedIntervalFilter);

								if (definedConverterField) {
									fieldFilterVal = fieldSettings
											.requestConverter(fieldFilterVal);
								}
								if (definedFilter) {
									filters[filterBean + "." + fieldFilter] = fieldFilterVal;
									filters["filter[" + numFilters + "].key"] = fieldFilter;
									if (definedIntervalFilter) {
										if (definedConverterIntervalField) {
											fieldFilterIntervalVal = fieldSettings
													.requestConverter(fieldFilterIntervalVal);
										}
										filters[filterIntervalBean + "."
												+ fieldFilter] = fieldFilterIntervalVal;
										filters["filter[" + numFilters
												+ "].value"] = "BETWEEN";
									} else {
										filters["filter[" + numFilters
												+ "].value"] = "ILIKE";
									}
									numFilters++;
								}
							});
			/**
			 * test request
			 */
			var filter = {
				"ait.pontosAit" : null,
				"filter[0].key" : "veiculo",
				"filter[0].value" : "ISNULL"
			};

			req = jTable2.mergeObjects(req, filters);

			/**
			 * sort parameters
			 */
			var order = {};
			for ( var f in this.settings.fields) {
				var cf = this.settings.fields[f];
				if (typeof cf.order != "undefined"
						&& (cf.order.toLowerCase() == "asc" || cf.order
								.toLowerCase() == "desc")) {
					order = {
						"sort[0].key" : f,
						"sort[0].value" : cf.order.toUpperCase()
					};
					break;
				}
			}
			req = jTable2.mergeObjects(req, order);
			/**
			 * page parameters
			 */
			var pages = {};
			pages[this.settings.pagesParameters["currentPage"]] = this.settings.currentPage;
			pages[this.settings.pagesParameters["maxPerPage"]] = this.settings.maxPerPage;
			req = jTable2.mergeObjects(req, pages);
			$
					.ajax({
						type : this.settings.requestMethod,
						url : this.settings.url,
						data : req,
						dataType : 'json',
						success : function(json) {
							instance.requestUnlock();
							instance.processResult(json);
							if (instance.settings.callback != null
									&& typeof instance.settings.callback == "function") {
								instance.settings.callback();
							}
						},
						error : function(XMLHttpRequest, textStatus,
								errorThrown) {
							instance.requestUnlock();
							instance.log("error");
							var msg = jTable2.getMessage("not.available",
									instance.settings.lang);
							$(instance.element).find(
									".resultArea .tableContainer").html(
									"<div class='messageError'>" + msg
											+ "</div>");
						}
					});
		}
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
		this.settings.totalPages = total;

		/**
		 * no results found
		 */
		if (!root || root.length == 0) {
			var msg = jTable2
					.getMessage("empty.result", instance.settings.lang);
			$(instance.element).find(".resultArea .tableContainer").html(
					"<div class='messageError'>" + msg + "</div>");
			return;
		}

		/**
		 * if opened a page bigger than total
		 */
		if (this.settings.currentPage >= total) {
			this.goToPage(total - 1);
			return;
		}

		if (typeof root != "undefined") {
			var content = "<table class='resultAreaTable'>";

			/**
			 * head
			 */
			content += "<thead><tr>";
			content += "<th rowspan=2 class='enumerate nofield'>#</th>";

			for ( var f in this.settings.fields) {
				var fieldInfo = this.settings.fields[f];
				var classes = "icon";
				var thclasses = "";
				if (typeof this.settings.fields[f].order != "undefined") {
					/**
					 * define presentation to column order
					 */
					var asc = (this.settings.fields[f].order.toLowerCase() == "asc") ? true
							: false;
					classes += (" selectedIcon ui-icon " + ("ui-icon-triangle-1-" + (asc ? "s"
							: "n")));
					thclasses = " class='selected'";
				}
				content += "<th rowspan=2" + thclasses
						+ "><div class='columnName' style='display: none'>" + f
						+ "</div><div class='columnTitle'>";
				content += fieldInfo.title;
				content += "<div class='" + classes + "'></div></div></th>";
			}

			/**
			 * actions
			 */
			if (this.settings.actions != null
					|| this.settings.multipleActions != null) {
				var actionsKeys = Object.keys(this.settings.actions);
				var multipleActionsKeys = (this.settings.multipleActions != null) ? 1
						: 0;
				var numActions = actionsKeys.length + multipleActionsKeys;
				content += "<th colspan='" + numActions + "' class='nofield'>"
						+ jTable2.getMessage("actions", this.settings.lang)
						+ "</th>";
				content += "</tr><tr>";

				for ( var i = 0; i < actionsKeys.length; i++) {
					var action = this.settings.actions[actionsKeys[i]];
					var s = [];
					if (typeof action.style == "object") {
						for ( var stk in action.style) {
							var st = action.style;
							s.push(stk + ":" + st[stk]);
						}
					}
					content += "<th style='" + (s.join(";"))
							+ "' class='nofield'>" + action.title + "</th>";
				}
				if (this.settings.multipleActions != null) {
					var s = [];
					if (typeof this.settings.multipleActions.style == "object") {
						for ( var stk in this.settings.multipleActions.style) {
							var st = this.settings.multipleActions.style;
							s.push(stk + ":" + st[stk]);
						}
					}
					content += "<th style='" + (s.join(";"))
							+ "' class='nofield checkall'>@</th>";
				}
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

				content += "<td class='enumerate' style='text-align: center; width: 20px'>"
						+ ((i + 1) + (this.settings.currentPage * this.settings.maxPerPage))
						+ "<div class='fieldInfo id'>"
						+ jTable2.getNodeField(tuple, this.settings.idField)
						+ "</div></td>";

				for ( var f in this.settings.fields) {
					var fieldInfo = this.settings.fields[f];
					/**
					 * value for column f
					 */
					var fieldVal = jTable2.getNodeField(tuple, f) || "";
					var fieldFullVal = null;
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
										format = format
												|| Date.getLocaleDateString();
										// momentFormat =
										// jTable2.momentLocalized(momentFormat);
										// res = (format != null) ? moment(
										// new Date(val)).format(
										// momentFormat) : new Date(val);
										res = (format != null) ? new Date(val)
												.toString(format) : new Date();
										break;
									case "datetime":
										format = format
												|| Date.getLocaleDateString()
												+ " HH:mm:ss";
										// momentFormat =
										// jTable2.momentLocalized(momentFormat);
										// res = (format != null) ? moment(
										// new Date(val)).format(
										// momentFormat) : new Date(val);
										res = (format != null) ? new Date(val)
												.toString(format) : new Date();
										break;

									default:
										res = val;
										if (maxLen > 0 && val.length > maxLen) {
											fieldFullVal = val.replace(
													/(['"])/g, "\\$1"); // escape
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

					/**
					 * compile styles
					 */
					var s = [];
					for ( var st in fieldInfo.style) {
						s.push(st + ": " + fieldInfo.style[st]);
					}

					/**
					 * set cell
					 */
					fieldFullVal = (fieldFullVal != null) ? " title='"
							+ fieldFullVal + "' " : "";

					content += "<td style='" + s.join(";") + "' "
							+ fieldFullVal + ">" + fieldVal + "</td>";
				}
				if (this.settings.actions != null) {
					for ( var actionKey in this.settings.actions) {
						var action = this.settings.actions[actionKey];
						var val = "";
						if (action.buttonClass) {
							val = "<div class='" + action.buttonClass
									+ "'></div>";
						} else {
							val = actionKey;
						}

						var s = [];
						if (typeof action.style == "object") {
							for ( var stk in action.style) {
								var st = action.style;
								s.push(stk + ":" + st[stk]);
							}
						}

						content += "<td class='actionCell' style='"
								+ (s.join(";")) + "' >" + val + "</td>";
					}
				}
				if (this.settings.multipleActions != null) {
					var s = [];
					if (typeof this.settings.multipleActions.style == "object") {
						for ( var stk in this.settings.multipleActions.style) {
							var st = this.settings.multipleActions.style;
							s.push(stk + ": " + st[stk]);
						}
					}
					content += "<td class='actionCell checkboxes' style='"
							+ (s.join(";"))
							+ "'><input type='checkbox' name='resultAreaIds' /></td>";
				}
				content += "</tr>";
				odd = (odd) ? false : true;
			}
			content += "</tbody>";
			content += "</table>";
			/**
			 * insert result table
			 */
			$(this.element).find(".resultArea .tableContainer").html(content);
			if (!this.settings.enumerate) {
				$(this.element).find(".resultArea .enumerate").hide();
			}
			// $(this.element).find(".resultArea .tableContainer").show();

			$(this.element).find(".resultArea table th.checkall").click(
					function() {
						$(instance.element).find(
								".resultArea table tbody input[type=checkbox]")
								.each(function(i, e) {
									this.checked = !this.checked;
								});
					});

			/**
			 * add column order controls
			 */
			$(this.element)
					.find(".resultArea table thead th:not(.nofield)")
					.click(
							function() {
								/**
								 * change presentation to column order
								 */
								var colName = $(this).find(".columnName")
										.text();
								var asc = ($(this).find(
										".icon.ui-icon-triangle-1-n").length == 1 || $(
										this).find(".icon").length == 0);
								$(instance.element).find(
										".resultArea table thead th").each(
										function(i, e) {
											$(e).removeClass("selected");
											var icon = $(e).find(".icon");
											icon.removeClass();
											icon.addClass("icon");
										});
								$(this).addClass("selected");
								$(this).find(".icon").addClass("selectedIcon");
								$(this).find(".icon").addClass("ui-icon");
								$(this).find(".icon").addClass(
										"ui-icon-triangle-1-"
												+ (asc ? "s" : "n"));
								/**
								 * remove order for all
								 */
								for ( var f in instance.settings.fields) {
									delete instance.settings.fields[f].order;
								}
								;
								/**
								 * define column order
								 */
								instance.settings.fields[colName].order = (asc ? "asc"
										: "desc");
								instance.load();
							});
			/**
			 * action buttons
			 */
			$(this.element)
					.find(
							".resultArea table tbody td.actionCell:not(.checkboxes)")
					.click(
							function() {
								var elIdx = 0;
								var tds = $(this).parent().find(
										".actionCell:not(.checkboxes)");
								for ( var i = 0; i < tds.length; i++) {
									if (this == tds[i]) {
										elIdx = i;
										break;
									}
								}
								var id = $(this).parent().find(".fieldInfo.id")
										.text();
								var keys = Object
										.keys(instance.settings.actions);
								var action = instance.settings.actions[keys[elIdx]];
								instance.doAction(id, action);
							});

			/**
			 * default action
			 */
			$(this.element).find(".resultArea table tbody td:not(.actionCell)")
					.click(function() {
						var id = $(this).parent().find(".fieldInfo.id").text();
						var action = instance.settings.defaultAction;
						instance.doAction(id, action);
					});

			/**
			 * paginating
			 */
			var startPage = this.settings.currentPage
					- parseInt((this.settings.maxPagesViewed / 2), 10);
			if (startPage < 0)
				startPage = 0;
			var lastPage = startPage + this.settings.maxPagesViewed;
			if (lastPage > total) {
				startPage -= (lastPage - total);
				if (startPage < 0)
					startPage = 0;
			}
			content = "<ul class='pager'>";
			for ( var i = startPage; i < total && i < lastPage; i++) {
				content += "<li><a href='javascript:;' rel='" + i + "'>"
						+ (i + 1) + "</a></li>";
			}
			content += "</ul>";
			$(this.element).find(".paginatingArea").html(content);
			var pagerButtons = $(instance.element).find(
					".paginatingArea ul.pager li");
			for ( var i = 0; i < pagerButtons.length; i++) {
				$(pagerButtons[i]).click(function() {
					var page = parseInt($(this).find("a").attr('rel'), 10);
					instance.goToPage(page);
					return false;
				});
			}

			/**
			 * change style pager
			 */
			$(this.element).find(".paginatingArea li").removeClass();
			$(this.element).find(".paginatingArea a").removeClass();
			$(this.element).find(
					".paginatingArea a[rel=" + this.settings.currentPage + "]")
					.addClass("current");
			$(this.element).find(
					".paginatingArea a[rel=" + this.settings.currentPage + "]")
					.parent().addClass("current");

			$(instance.element).find(".paginatingArea").fadeIn('fast');
		} else {
			this.log("fatal: root node not found (" + this.settings.rootNode
					+ ")");
		}
	};

	jTable2.prototype.doAction = function(id, action) {
		var instance = this;
		if (!this.isRequestLocked()) {
			this.requestLock();
			var url = action.url.replace("{" + action.id + "}", id);
			var idField = this.settings.filterBean + "."
					+ this.settings.idField;
			var getString = "";
			var req = {};
			if (action.url == url) {
				req[idField] = id;
				getString = "?" + idField + "=" + id;
			}
			if (!action.callback) {
				window.location.href = url + getString;
			} else {
				var method = (!action.method) ? "GET"
						: (action.method.toLowerCase() == "get" || action.method
								.toLowerCase() == "POST");
				$.ajax({
					type : method,
					url : url,
					data : req,
					dataType : 'json',
					success : function(json) {
						instance.requestUnlock();
						action.callback(json, null);
					},
					error : function(XMLHttpRequest, textStatus, errorThrown) {
						instance.requestUnlock();
						action.callback(null, errorThrown);
					}
				});
			}
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
		"add.filters" : {
			"en" : "Add filters",
			"pt" : "Adicionar filtros"
		},
		"cancel" : {
			"en" : "Cancel",
			"pt" : "Cancelar"
		},
		"search" : {
			"en" : "Search",
			"pt" : "Buscar"
		},
		"inverval" : {
			"en" : "Interval",
			"pt" : "Intervalo"
		},
		"filters.unavaliable" : {
			"en" : "Unavaliable filters to add",
			"pt" : "Não há filtros para adicionar"
		},
		"actions" : {
			"en" : "Actions",
			"pt" : "Ações"
		},
		"action" : {
			"en" : "Action",
			"pt" : "Ação"
		},
		"not.available" : {
			"en" : "Server not available. Try again.",
			"pt" : "Serviço não disponível. Tente novamente."
		},
		"empty.result" : {
			"en" : "No records found",
			"pt" : "Nenhum registro encontrado"
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
	 * adjust time to momentjs
	 */
	jTable2.momentLocalized = function(format) {
		var momentFormat = format.replace(/([^y]|^)(yy)([^y])/, "$1YYYY$3");
		momentFormat = momentFormat.replace(/([^d]|^)(dd)([^d])/, "$1DD$3");
		momentFormat = momentFormat.replace(/([^m]|^)(mm)([^m])/, "$1MM$3");
		return momentFormat;
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

	/***************************************************************************
	 * JQuery extension
	 */
	$.fn.jTable2 = function(settings) {

		/**
		 * default settings
		 */
		settings = $.extend({
			debug : false,
			maxPagesViewed : 7,
			requestMethod : "POST",
			rootNode : "list",
			totalPagesNode : "total",
			currentPage : 0,
			totalPages : -1,
			filterBean : "bean",
			filterIntervalBean : "beanInterval",
			maxPerPage : 10,
			pagesParameters : {
				currentPage : "currentPage",
				maxPerPage : "maxPerPage"
			}
		}, settings);

		/**
		 * external methods to div
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
			refresh : function() {
				this.load();
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
			 * create new instance to this element, if not exist
			 */
			if (instance == null) {
				instance = new jTable2(e, settings);
				jTable2.instances.push(instance);
			} else {
				instance.setSettings(settings);
			}
		});
	};
})(jQuery);

$.datepicker.regional['pt'] = {
	closeText : 'Fechar',
	prevText : '&#x3c;Anterior',
	nextText : 'Pr&oacute;ximo&#x3e;',
	currentText : 'Hoje',
	monthNames : [ 'Janeiro', 'Fevereiro', 'Mar&ccedil;o', 'Abril', 'Maio',
			'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro',
			'Dezembro' ],
	monthNamesShort : [ 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago',
			'Set', 'Out', 'Nov', 'Dez' ],
	dayNames : [ 'Domingo', 'Segunda-feira', 'Ter&ccedil;a-feira',
			'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado' ],
	dayNamesShort : [ 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab' ],
	dayNamesMin : [ 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab' ],
	weekHeader : 'Sm',
	dateFormat : 'dd/mm/yy',
	firstDay : 0,
	isRTL : false,
	showMonthAfterYear : false,
	yearSuffix : ''
};

$.timepicker.regional['pt'] = {
	timeOnlyTitle : 'Escolha uma hora',
	timeText : 'Tempo',
	hourText : 'Hora',
	minuteText : 'Minuto',
	secondText : 'Segundo',
	millisecText : 'Milisegundo',
	timezoneText : 'Fuso hor&aacute;rio',
	currentText : 'Agora',
	closeText : 'Fechar',
	timeFormat : 'HH:mm',
	amNames : [ 'AM', 'A' ],
	pmNames : [ 'PM', 'P' ],
	isRTL : false
};