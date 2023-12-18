/*
 (c) VNexsus 2023

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
 
(function(window, undefined){


    window.Asc.plugin.init = function() {
		$(document.body).addClass(window.Asc.plugin.getEditorTheme());
		
		$("#search-input").on("input", function(){window.Asc.plugin.searchIcon()});
		
		iconGroups.forEach(function(group, index){
			var button = $("<button class=\"btn btn-category\"/>").attr("data-target",index).text(group.name);
			$(".menu-panel").append(button);
			button.on("click", function(){window.Asc.plugin.switchPanel(index)});
		});
		if($(".btn.btn-category").length > 0)
			$(".btn.btn-category")[0].click();
		var defaultColor = window.getComputedStyle($("#icon")[0])["background-color"];
		$("#icon").css("background-color", defaultColor);
		
		$(".color-picker").each(function(){
			const pickr = new Pickr({
			  el: this,
			  useAsButton: true,
			  default: this.style.backgroundColor,
			  theme: 'monolith',
			  defaultRepresentation: 'HEX',
			  autoReposition: true,
			  sliders: 'h',
			  lockOpacity: false,
			  swatches: null,
			  position: 'right-end',
			  padding: 4,
			  components: {
				preview: false,
				opacity: true,
				hue: true,
				interaction: {
				  hex: false,
				  rgba: false,
				  hsva: false,
				  input: true,
				  save: false
				}
			  }
			})
			.on('change', color => {
				this.style.backgroundColor = color.toHEXA().toString(0);
				$('#customColor-'+ this.id).detach();
				$('<style id="customColor-'+ this.id +'">.'+ this.id +' { fill: '+ color.toHEXA().toString(0) +'; }</style>').appendTo('head');
			});
		});
	};

	window.Asc.plugin.selectIcon = function(icon) {
		$(icon.svg).addClass("icon").appendTo($("#Preview").find(".icon-preview-container"))
		$("#Preview").find("#icon-name").text(icon.name);
		$("#Preview").find("#icon-tags").text(icon.tags || "");
		$("#Preview").find("#icon-style").text(icon.style ? icon.style : "line");
		$("div[id^='style-']").css("display","none");
		$("#Preview").find("#style-"+ (icon.style ? icon.style : "line")).css("display","block");
		$("#Panel").removeClass("active");
		$("#Panel").find(".inner-content").find(".content").empty();
		$("#Preview").addClass("active");
		$("#Preview").find("#insert-button").on("click", function(){
			window.Asc.plugin.convertIcon($("#Preview").find(".icon")[0]);
		});
	};
	
	function copyStylesInline(destinationNode, sourceNode) {
		if(sourceNode.nodeName != "#text"){
			var styleToCopy = ["fill"];
			var style = sourceNode.currentStyle || window.getComputedStyle(sourceNode);
			if (style == "undefined" || style == null) return;
			for (var st = 0; st < styleToCopy.length; st++){
				destinationNode.style.setProperty(styleToCopy[st], style[styleToCopy[st]]);
			}
			for (var cd = 0; cd < destinationNode.childNodes.length; cd++) {
				var child = destinationNode.childNodes[cd];
				copyStylesInline(child, sourceNode.childNodes[cd]);
			}
		}
	}
	
	window.Asc.plugin.convertIcon = function(svgNode) {
		var copy = svgNode.cloneNode(true);
		copyStylesInline(copy, svgNode);
		const svgString = (new XMLSerializer()).serializeToString(copy);
		const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
		const DOMURL = window.URL || window.webkitURL || window;
		const url = DOMURL.createObjectURL(svgBlob);
		const image = new Image();
		let ratio = svgNode.viewBox.baseVal.width/svgNode.viewBox.baseVal.height;
		image.width = svgNode.width.baseVal.value*3;
		image.height = svgNode.height.baseVal.value/ratio*3;
		image.src = url;
		image.onload = function () {
			const canvas = document.createElement('canvas');
			canvas.width = image.width;
			canvas.height = image.height;
			const ctx = canvas.getContext('2d');
			ctx.drawImage(image, 0, 0);
			DOMURL.revokeObjectURL(url);
			const imgURI = canvas
			.toDataURL('image/png')
			window.Asc.plugin.insertIcon(imgURI, image.width/3, image.height/3);
		};
	}

	window.Asc.plugin.insertIcon = function(imageData, width, height){
		Asc.scope.image = imageData;
		Asc.scope.width = width;
		Asc.scope.height = height;
		switch (window.Asc.plugin.info.editorType) {
			case 'word': {
				window.Asc.plugin.callCommand(function(){
					var oDocument = Api.GetDocument();
					oDocument.RemoveSelection();
					var oParagraph = Api.CreateParagraph();
					var oDrawing = Api.CreateImage(Asc.scope.image, Asc.scope.width * 9534, Asc.scope.height * 9534);
					oParagraph.AddDrawing(oDrawing);
					oDocument.InsertContent([oParagraph]);
				}, false, true, function(){});
				break;
			}
			case 'cell': {
				window.Asc.plugin.callCommand(function () {
					var oWorksheet = Api.GetActiveSheet();
					var oActiveCell = oWorksheet.GetActiveCell();
					oWorksheet.AddImage(Asc.scope.image, Asc.scope.width * 9534, Asc.scope.height * 9534, oActiveCell.GetCol()+1, 0, oActiveCell.GetRow(), 0);
				}, true);
				break;
			}
			case 'slide': {
				window.Asc.plugin.callCommand(function () {
					var oPresentation = Api.GetPresentation();
					var oSlide = oPresentation.GetCurrentSlide();
					var oSlideWidth = oSlide.GetWidth();
					var oSlideHeight = oSlide.GetHeight();
					var oDrawing = Api.CreateImage(Asc.scope.image, Asc.scope.width * 9534, Asc.scope.height * 9534);
					oSlide.AddObject(oDrawing);
					oDrawing.SetPosition((oSlideWidth - Asc.scope.width * 9534)/2, (oSlideHeight - Asc.scope.height * 9534)/2);
				}, true);
				break;
			}

		}
	}
	
	window.Asc.plugin.searchIcon = function(){
		var pattern = $("#search-input").val();
		if(pattern) {
			var button = $(".btn.btn-category[data-target='SearchResults']");
			if(button.length == 0){
				button = $("<button class=\"btn btn-category\" data-target=\"SearchResults\">Найденное</div>")
				$(".search").after(button);
				button.on("click", function(){window.Asc.plugin.switchPanel("SearchResults")});
			}
			var panel = $("#SearchResults");
			if(panel.length == 0){
				panel = $("<div id=\"SearchResults\" class=\"settings-panel\"/>");
				var contentContainer = $("<div class=\"inner-content\">");
				var content = $("<div class=\"content\"/>");
				panel.append(contentContainer);
				contentContainer.append(content);
				panel.append(contentContainer);
				$(".content-panel").append(panel);
			}
			else{
				content = panel.find(".content");
				panel.find(".icon-container").remove();
			}
			window.Asc.plugin.switchPanel("SearchResults");
			
			const options = {
				includeScore: true,
				minMatchCharLength: 2,
				threshold: 0.4,
				keys: ['name', 'tags']
			}
			const fuse = new Fuse(icons, options)
			const results = fuse.search(pattern)
			
			results.forEach(function(icon){
				var iconContainer = $("<span class=\"icon-container\"/>").attr("title",icon.item.name);
				var img = $(icon.item.svg).addClass("icon");
				var name = $("<span class=\"name\"/>").text(icon.item.name);
				iconContainer.append(img);
				iconContainer.append(name);
				content.append(iconContainer);
				iconContainer.on("click",function(){window.Asc.plugin.selectIcon(icon.item)});
			});
		}
		else {
			$("#SearchResults").remove();
			$(".btn.btn-category[data-target='SearchResults']").remove();
			$(".btn.btn-category")[0].click();
		}
	}
	
    window.Asc.plugin.button = function(id){
		this.executeCommand("close", "");
	};

	window.Asc.plugin.switchPanel = function(index){
		$("#Preview").removeClass("active");
		$("#Preview").find(".icon").remove();
		$(".btn.btn-category").removeClass("active");
		$(".btn.btn-category[data-target='"+ index +"']").addClass("active");
		var panel = $("#Panel");
		var contentContainer = panel.find(".inner-content");
		var content = contentContainer.find(".content");
		content.empty();
		if(index != "SearchResults"){
			icons.filter(function(icon){
				if(iconGroups[index].icons.split(',').indexOf(icon.name) != -1 || iconGroups[index].icons == "*"){
					var iconContainer = $("<span class=\"icon-container\"/>").attr("title",icon.name);
					var img = $(icon.svg).addClass("icon");
					var name = $("<span class=\"name\"/>").text(icon.name);
					iconContainer.append(img);
					iconContainer.append(name);
					content.append(iconContainer);
					iconContainer.on("click",function(){window.Asc.plugin.selectIcon(icon)});
				}
			});
			$("#Panel").addClass("active");
		}
		else {
			$("#Panel").removeClass("active");
			$("#SearchResults").addClass("active");
		}
	}

	window.Asc.plugin.onThemeChanged = function(theme){
		window.Asc.plugin.onThemeChangedBase(theme);
		$(document.body).removeClass("theme-dark theme-light").addClass(window.Asc.plugin.getEditorTheme());
	}

	window.Asc.plugin.getEditorTheme = function(){
		if(window.localStorage.getItem("ui-theme-id")){
			var match = window.localStorage.getItem("ui-theme-id").match(/\S+\-(\S+)/);
			if(match.length==2)
				return "theme-" + match[1];
		}
		return "theme-light";
	}
	
})(window, undefined);
