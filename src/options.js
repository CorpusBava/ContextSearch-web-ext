window.browser = (function () {
  return window.msBrowser ||
    window.browser ||
    window.chrome;
})();

// not jQuery 
var $ = s => {
	return document.querySelector(s);
}

// array for storage.local
var userOptions = {};

// Browse button for manual import
$("#selectMozlz4FileButton").addEventListener('change', ev => {
	
	let searchEngines = [];
	let file = ev.target.files[0];
	
	if ( $('#cb_overwriteOnImport').checked && confirm("This will delete all custom search engines, folders, bookmarklets, separators, etc. Are you sure?") ) {
		userOptions.nodeTree.children = [];
		userOptions.searchEngines = [];
	}
	
	readMozlz4File(file, text => { // on success

		// parse the mozlz4 JSON into an object
		var engines = JSON.parse(text).engines;	
		searchEngines = searchJsonObjectToArray(engines);

		$('#status_div').style.display='inline-block';
		statusMessage({
			img: browser.runtime.getURL("icons/spinner.svg"),
			msg: browser.i18n.getMessage("LoadingRemoteContent"),
			color: "transparent",
			invert: false
		});

		let newEngines = [];
		
		for (let se of searchEngines) {
			
			if (!userOptions.searchEngines.find( _se => _se.title === se.title)) {
				console.log(se.title + " not included in userOptions.searchEngines");
				
				// add to searchEngines
				newEngines.push(se);
				
				let node = {
					type: "searchEngine",
					title: se.title,
					id: se.id,
					hidden: se.hidden || false
				}

				// replace one-click nodes with same name
				let ocn = findNodes(userOptions.nodeTree, (_node, parent) => {
					if ( _node.type === 'oneClickSearchEngine' && _node.title === se.title ) {
						parent.children.splice(parent.children.indexOf(_node), 1, node);
						return true;
					}
					return false;
				});
				
				if ( ocn.length ) {
					console.log(se.title + " one-click engine found. Replacing node");
				} else {
					// add to nodeTree
					userOptions.nodeTree.children.push(node);
				}
				
			}
		}
		// end 1.3.2+
		
		// get remote icons for new engines
		loadRemoteIcon({
			searchEngines: newEngines, // 1.3.2+
		}).then( (details) => {
			
			// append the new engines
			userOptions.searchEngines = userOptions.searchEngines.concat(details.searchEngines);
			saveOptions();
			
			if (details.hasFailedCount) {
				statusMessage({
					img: "icons/alert.svg",
					msg: browser.i18n.getMessage("LoadingRemoteContentFail").replace("%1", details.hasFailedCount),
					color: "transparent",
					invert: false
				});
			} else if (details.hasTimedOut) {
				statusMessage({
					img: "icons/alert.svg",
					msg: browser.i18n.getMessage("LoadingRemoteContentTimeout"),
					color: "transparent",
					invert: false
				});
			} else {
				statusMessage({
					img: "icons/checkmark.svg",
					msg: browser.i18n.getMessage("ImportedEngines").replace("%1", searchEngines.length).replace("%2", details.searchEngines.length),
					color: "#41ad49",
					invert: true
				});
			}
				
			// if (window.location.hash === '#quickload') {
				// browser.runtime.sendMessage({action: "closeWindowRequest"});
			// }
			
			buildSearchEngineContainer();
		});

	}, function() { // on fail

		// print status message to Options page
		statusMessage({
			img: "icons/crossmark.svg",
			msg: "Failed to load search engines :(",
			color: "red",
			invert: true
		});
	});

});

function statusMessage(status) {				
	$('#status_img').src = status.img || "";
	$('#status').innerText = status.msg || "";
	
	let img = $('#status_img');
	
	img.parentNode.style.backgroundColor = status.color;
	img.style.filter = status.invert ? 'invert(1)' : 'none';

}



function restoreOptions() {

	function onGot(result) {

		userOptions = result.userOptions || {};

		$('#cb_quickMenu').checked = userOptions.quickMenu;	
		$('#n_quickMenuColumns').value = userOptions.quickMenuColumns;
		$('#n_quickMenuRows').value = userOptions.quickMenuRows;
		$('#n_quickMenuRowsSingleColumn').value = userOptions.quickMenuRowsSingleColumn;
		
		$('#b_quickMenuKey').value = userOptions.quickMenuKey;
		$('#b_quickMenuKey').innerText = keyCodeToString(userOptions.quickMenuKey) || browser.i18n.getMessage('ClickToSet');
		
		$('#b_contextMenuKey').value = userOptions.contextMenuKey;	
		$('#b_contextMenuKey').innerText = keyCodeToString(userOptions.contextMenuKey) || browser.i18n.getMessage('ClickToSet');
		$('#s_contextMenuSearchLinksAs').value = userOptions.contextMenuSearchLinksAs;
		
		$('#r_quickMenuOnKey').checked = userOptions.quickMenuOnKey;
		$('#cb_quickMenuOnHotkey').checked = userOptions.quickMenuOnHotkey;
		
		$('#d_hotkey').appendChild(keyArrayToButtons(userOptions.quickMenuHotkey));
		$('#d_hotkey').key = userOptions.quickMenuHotkey;
		
		$('#cb_quickMenuOnMouse').checked = userOptions.quickMenuOnMouse;
		$('#s_quickMenuOnMouseMethod').value = userOptions.quickMenuOnMouseMethod;
		$('#cb_quickMenuSearchOnMouseUp').checked = userOptions.quickMenuSearchOnMouseUp;
		$('#r_quickMenuAuto').checked = userOptions.quickMenuAuto;
		$('#cb_quickMenuAutoOnInputs').checked = userOptions.quickMenuAutoOnInputs;
		$('#cb_quickMenuOnLinks').checked = userOptions.quickMenuOnLinks;
		$('#cb_quickMenuOnImages').checked = userOptions.quickMenuOnImages;
		$('#cb_quickMenuCloseOnScroll').checked = userOptions.quickMenuCloseOnScroll;
		$('#cb_quickMenuCloseOnClick').checked = userOptions.quickMenuCloseOnClick;
		$('#s_quickMenuToolsPosition').value = userOptions.quickMenuToolsPosition;
		$('#cb_quickMenuToolsAsToolbar').checked = userOptions.quickMenuToolsAsToolbar;
		$('#s_quickMenuSearchBar').value = userOptions.quickMenuSearchBar;
		$('#cb_quickMenuSearchBarFocus').checked = userOptions.quickMenuSearchBarFocus;
		$('#cb_quickMenuSearchBarSelect').checked = userOptions.quickMenuSearchBarSelect;
		$('#range_quickMenuScale').value = userOptions.quickMenuScale;
		$('#range_quickMenuIconScale').value = userOptions.quickMenuIconScale;
		$('#i_quickMenuScale').value = (parseFloat(userOptions.quickMenuScale) * 100).toFixed(0) + "%";
		$('#i_quickMenuIconScale').value = (parseFloat(userOptions.quickMenuIconScale) * 100).toFixed(0) + "%";
		$('#n_quickMenuOffsetX').value = userOptions.quickMenuOffset.x;
		$('#n_quickMenuOffsetY').value = userOptions.quickMenuOffset.y;
		
		$('#cb_quickMenuOnSimpleClick').checked = userOptions.quickMenuOnSimpleClick.enabled;
		$('#s_quickMenuOnSimpleClickButton').value = userOptions.quickMenuOnSimpleClick.button.toString();
		$('#cb_quickMenuOnSimpleClickAlt').checked = userOptions.quickMenuOnSimpleClick.alt;
		$('#cb_quickMenuOnSimpleClickCtrl').checked = userOptions.quickMenuOnSimpleClick.ctrl;
		$('#cb_quickMenuOnSimpleClickShift').checked = userOptions.quickMenuOnSimpleClick.shift;
		
		$('#s_quickMenuMouseButton').value = userOptions.quickMenuMouseButton.toString();
		$('#cb_contextMenu').checked = userOptions.contextMenu;
		$('#h_position').value = userOptions.quickMenuPosition;

		for (let p of document.getElementsByClassName('position')) {
			p.className = p.className.replace(' active', '');
			if (p.dataset.position === userOptions.quickMenuPosition)
				p.className+=' active';
		}
		
		buildToolIcons();
		
		$('#cb_quickMenuToolsLockPersist').checked = userOptions.quickMenuTools.find( tool => tool.name === "lock").persist || false;
		$('#cb_quickMenuToolsRepeatSearchPersist').checked = userOptions.quickMenuTools.find( tool => tool.name === "repeatsearch").persist || false;

		// $('#cb_automaticImport').checked = (userOptions.reloadMethod === 'automatic')

		$('#s_contextMenuClick').value = userOptions.contextMenuClick;
		$('#s_contextMenuMiddleClick').value = userOptions.contextMenuMiddleClick;
		$('#s_contextMenuRightClick').value = userOptions.contextMenuRightClick;
		$('#s_contextMenuShift').value = userOptions.contextMenuShift;
		$('#s_contextMenuCtrl').value = userOptions.contextMenuCtrl;
		
		$('#cb_contextMenuShowAddCustomSearch').checked = userOptions.contextMenuShowAddCustomSearch;
		$('#cb_contextMenuShowRecentlyUsed').checked = userOptions.contextMenuShowRecentlyUsed;
		$('#cb_contextMenuShowRecentlyUsedAsFolder').checked = userOptions.contextMenuShowRecentlyUsedAsFolder;
		$('#n_contextMenuRecentlyUsedLength').value = userOptions.recentlyUsedListLength;
		$('#cb_contextMenuShowFolderSearch').checked = userOptions.contextMenuShowFolderSearch;
		
		$('#s_quickMenuLeftClick').value = userOptions.quickMenuLeftClick;
		$('#s_quickMenuRightClick').value = userOptions.quickMenuRightClick;
		$('#s_quickMenuMiddleClick').value = userOptions.quickMenuMiddleClick;
		$('#s_quickMenuShift').value = userOptions.quickMenuShift;
		$('#s_quickMenuCtrl').value = userOptions.quickMenuCtrl;
		$('#s_quickMenuAlt').value = userOptions.quickMenuAlt;
		
		$('#s_quickMenuFolderLeftClick').value = userOptions.quickMenuFolderLeftClick;
		$('#s_quickMenuFolderRightClick').value = userOptions.quickMenuFolderRightClick;
		$('#s_quickMenuFolderMiddleClick').value = userOptions.quickMenuFolderMiddleClick;
		$('#s_quickMenuFolderShift').value = userOptions.quickMenuFolderShift;
		$('#s_quickMenuFolderCtrl').value = userOptions.quickMenuFolderCtrl;
		$('#s_quickMenuFolderAlt').value = userOptions.quickMenuFolderAlt;
		$('#s_quickMenuSearchHotkeys').value = userOptions.quickMenuSearchHotkeys;
		$('#s_quickMenuSearchHotkeysFolders').value = userOptions.quickMenuSearchHotkeysFolders;
		
		$('#n_quickMenuAutoMaxChars').value = userOptions.quickMenuAutoMaxChars;
		$('#n_quickMenuOpeningOpacity').value = userOptions.quickMenuOpeningOpacity;
		$('#n_quickMenuAutoTimeout').value = userOptions.quickMenuAutoTimeout;
		$('#cb_quickMenuAllowContextMenu').checked = !userOptions.quickMenuAllowContextMenu;

		$('#cb_searchBarSuggestions').checked = userOptions.searchBarSuggestions;
		$('#cb_searchBarEnableHistory').checked = userOptions.searchBarEnableHistory;
		$('#cb_searchBarDisplayLastSearch').checked = userOptions.searchBarDisplayLastSearch;
		$('#s_searchBarDefaultView').value = userOptions.searchBarUseOldStyle ? "text" : "grid";
		$('#cb_searchBarCloseAfterSearch').checked = userOptions.searchBarCloseAfterSearch;
		$('#s_quickMenuDefaultView').value = userOptions.quickMenuUseOldStyle ? "text" : "grid";
		$('#n_searchBarColumns').value = userOptions.searchBarColumns;
		
		$('#n_sideBarColumns').value = userOptions.sideBar.columns;
		$('#s_sideBarDefaultView').checked = userOptions.sideBar.singleColumn ? "text" : "grid";
		$('#s_sideBarWidgetPosition').value = userOptions.sideBar.widget.position;
		$('#cb_sideBarWidgetEnable').checked = userOptions.sideBar.widget.enabled;
		$('#cb_sideBarStartOpen').checked = userOptions.sideBar.startOpen;
		$('#cb_sideBarCloseAfterSearch').checked = userOptions.sideBar.closeAfterSearch;
		
		$('#t_userStyles').value = userOptions.userStyles;
		$('#cb_userStylesEnabled').checked = userOptions.userStylesEnabled;
		$('#t_userStyles').disabled = !userOptions.userStylesEnabled;
		$('#cb_enableAnimations').checked = userOptions.enableAnimations;
	//	$('#s_quickMenuTheme').value = userOptions.quickMenuTheme;
		$('#s_searchBarTheme').value = userOptions.searchBarTheme;
		
		$('#cb_highLightEnabled').checked = userOptions.highLight.enabled;
		$('#cb_highLightFollowDomain').checked = userOptions.highLight.followDomain;
		$('#cb_highLightFollowExternalLinks').checked = userOptions.highLight.followExternalLinks;
		
		$('#s_highLightStyle').value = userOptions.highLight.highlightStyle;
		
		$('#c_highLightColor0').value = userOptions.highLight.styles[0].color;
		$('#c_highLightBackground0').value = userOptions.highLight.styles[0].background;
		$('#c_highLightColor1').value = userOptions.highLight.styles[1].color;
		$('#c_highLightBackground1').value = userOptions.highLight.styles[1].background;
		$('#c_highLightColor2').value = userOptions.highLight.styles[2].color;
		$('#c_highLightBackground2').value = userOptions.highLight.styles[2].background;
		$('#c_highLightColor3').value = userOptions.highLight.styles[3].color;
		$('#c_highLightBackground3').value = userOptions.highLight.styles[3].background;
		$('#c_highLightColorActive').value = userOptions.highLight.activeStyle.color;
		$('#c_highLightBackgroundActive').value = userOptions.highLight.activeStyle.background;
		$('#s_highLightOpacity').value = userOptions.highLight.opacity;
		
		$('#cb_highLightFlashSelected').checked = userOptions.highLight.flashSelected;

		$('#cb_highLightNavBarEnabled').checked = userOptions.highLight.navBar.enabled;
		$('#cb_highLightShowFindBar').checked = userOptions.highLight.showFindBar;
		
		$('#cb_highLightMarkOptionsSeparateWordSearch').checked = userOptions.highLight.markOptions.separateWordSearch;
		$('#cb_highLightMarkOptionsIgnorePunctuation').checked = userOptions.highLight.markOptions.ignorePunctuation;
		$('#cb_highLightMarkOptionsCaseSensitive').checked = userOptions.highLight.markOptions.caseSensitive;
		$('#s_highLightMarkOptionsAccuracy').value = userOptions.highLight.markOptions.accuracy;
		
		$('#cb_findBarMarkOptionsSeparateWordSearch').checked = userOptions.highLight.findBar.markOptions.separateWordSearch;
		$('#cb_findBarMarkOptionsIgnorePunctuation').checked = userOptions.highLight.findBar.markOptions.ignorePunctuation;
		$('#cb_findBarMarkOptionsCaseSensitive').checked = userOptions.highLight.findBar.markOptions.caseSensitive;
		$('#s_findBarMarkOptionsAccuracy').value = userOptions.highLight.findBar.markOptions.accuracy;
		
		$('#cb_findBarEnabled').checked = userOptions.highLight.findBar.enabled;
		$('#cb_findBarStartOpen').checked = userOptions.highLight.findBar.startOpen;
		$('#cb_findBarOpenInAllTabs').checked = userOptions.highLight.findBar.openInAllTabs;
		$('#cb_findBarSearchInAllTabs').checked = userOptions.highLight.findBar.searchInAllTabs;
		$('#s_findBarPosition').value = userOptions.highLight.findBar.position;
		$('#s_findBarWindowType').value = userOptions.highLight.findBar.windowType;
		$('#d_findBarHotKey').appendChild(keyArrayToButtons(userOptions.highLight.findBar.hotKey));
		$('#d_findBarHotKey').key = userOptions.highLight.findBar.hotKey;
		$('#cb_findBarShowNavBar').checked = userOptions.highLight.findBar.showNavBar;
		$('#n_findBarTimeout').value = userOptions.highLight.findBar.keyboardTimeout;

		buildSearchEngineContainer();
		
		// show / hide settings based on userOptions
		// (() => { // disable focus quick menu search bar when hotkeys enabled
			// let select = $('#s_quickMenuSearchHotkeys');
			
			// function toggle() {
				// let cb1 = $('#cb_quickMenuSearchBarFocus');

				// if (select.value === 'noAction') {
					// cb1.disabled = false;
					// cb1.parentNode.style.opacity = null;
				// } else {
					// cb1.disabled = true;
					// cb1.parentNode.style.opacity = .5;
				// }		
			// }
			// select.addEventListener('change', toggle);
			// toggle();
		// })();
		
		// [	
			// {s: "#s_quickMenuDefaultView", input: "#n_quickMenuColumns"},
			// {s: "#s_searchBarDefaultView", input: "#n_searchBarColumns"},
			// {s: "#s_sideBarDefaultView", input: "#n_sideBarColumns"}
		// ].forEach( obj => {
			// let s = $(obj.s);
			// let input = $(obj.input);
			
			// function toggle() {

				// if (!s.value === "text") {
					// input.disabled = false;
					// input.style.opacity = null;
				// } else {
					// input.disabled = true;
					// input.style.opacity = .5;
				// }		
			// }
			// s.addEventListener('change', toggle);
			// toggle();
		// });
		
		// allow context menu on right-click
		(() => {
			function onChange(e) {
				document.querySelector('[data-i18n="HoldForContextMenu"]').style.display = ( $('#s_quickMenuMouseButton').value === "3" && $('#s_quickMenuOnMouseMethod').value === "click" ) ? null	: 'none';	
			}
			
			[$('#s_quickMenuMouseButton'), $('#s_quickMenuOnMouseMethod')].forEach( s => {
				s.addEventListener('change', onChange);	
				onChange();
			});
			
			
		})();
		
		$('#n_searchBarHistoryLength').value = userOptions.searchBarHistoryLength;
		$('#n_searchBarSuggestionsCount').value = userOptions.searchBarSuggestionsCount;
		$('#cb_groupLabelMoreTile').checked = userOptions.groupLabelMoreTile;
		$('#cb_groupFolderRowBreaks').checked = userOptions.groupFolderRowBreaks;
		$('#cb_autoCopy').checked = userOptions.autoCopy;
		$('#cb_rememberLastOpenedFolder').checked = userOptions.rememberLastOpenedFolder;
		$('#cb_autoPasteFromClipboard').checked = userOptions.autoPasteFromClipboard;
		$('#cb_allowHotkeysWithoutMenu').checked = userOptions.allowHotkeysWithoutMenu;
		
		$('#n_quickMenuHoldTimeout').value = userOptions.quickMenuHoldTimeout;
		$('#cb_exportWithoutBase64Icons').checked = userOptions.exportWithoutBase64Icons;
		$('#cb_addSearchProviderHideNotification').checked = userOptions.addSearchProviderHideNotification;
		$('#cb_syncWithFirefoxSearch').checked = userOptions.syncWithFirefoxSearch;
		$('#cb_quickMenuTilesDraggable').checked = userOptions.quickMenuTilesDraggable; 
		$('#cb_disableNewTabSorting').checked = userOptions.disableNewTabSorting; 
		$('#cb_sideBarRememberState').checked = userOptions.sideBar.rememberState;
		$('#cb_sideBarOpenOnResults').checked = userOptions.sideBar.openOnResults;
		$('#cb_sideBarOpenOnResultsMinimized').checked = userOptions.sideBar.openOnResultsMinimized;
		$('#cb_quickMenuPreventPageClicks').checked = userOptions.quickMenuPreventPageClicks;

		$('#n_pageTilesRows').value = userOptions.pageTiles.rows;
		$('#n_pageTilesColumns').value = userOptions.pageTiles.columns;
		$('#cb_pageTilesEnabled').checked = userOptions.pageTiles.enabled;
		$('#s_pageTilesOpenMethod').value = userOptions.pageTiles.openMethod;
		$('#s_pageTilesPalette').value = userOptions.pageTiles.paletteString;
		
		$('#cb_contextMenuHotkeys').checked = userOptions.contextMenuHotkeys;

		$('#n_openFoldersOnHoverTimeout').value = userOptions.openFoldersOnHoverTimeout;

		document.dispatchEvent(new CustomEvent('userOptionsLoaded'));
	}
  
	function onError(error) {
		console.log(`Error: ${error}`);
	}

	browser.runtime.getBackgroundPage().then( w => {
		w.checkForOneClickEngines().then(c => onGot(w), onError);
	}, onError);
	
}

function saveOptions(e) {
	
	function onSet() {
		showSaveMessage(browser.i18n.getMessage("saved"), null, "yes", document.getElementById('saveNoticeDiv'));
		return Promise.resolve(true);
	}
	
	function onError(error) {
		console.log(`Error: ${error}`);
	}
	
	userOptions = {
		searchEngines: userOptions.searchEngines,
		nodeTree: JSON.parse(JSON.stringify(userOptions.nodeTree)),
		lastUsedId: userOptions.lastUsedId,
		quickMenu: $('#cb_quickMenu').checked,
		quickMenuColumns: parseInt($('#n_quickMenuColumns').value),
		quickMenuRows: parseInt($('#n_quickMenuRows').value),
		quickMenuRowsSingleColumn: parseInt($('#n_quickMenuRowsSingleColumn').value),
		defaultGroupColor: userOptions.defaultGroupColor,
		
		quickMenuKey: parseInt($('#b_quickMenuKey').value),
		contextMenuKey: parseInt($('#b_contextMenuKey').value),
		
		quickMenuOnKey: $('#r_quickMenuOnKey').checked,
		quickMenuOnHotkey: $('#cb_quickMenuOnHotkey').checked,
		quickMenuHotkey: $('#d_hotkey').key,
		quickMenuOnMouse: $('#cb_quickMenuOnMouse').checked,
		quickMenuOnMouseMethod: $('#s_quickMenuOnMouseMethod').value,
		quickMenuSearchOnMouseUp: $('#cb_quickMenuSearchOnMouseUp').checked,
		quickMenuMouseButton: parseInt($("#s_quickMenuMouseButton").value),
		quickMenuAuto: $('#r_quickMenuAuto').checked,
		quickMenuAutoOnInputs: $('#cb_quickMenuAutoOnInputs').checked,
		quickMenuOnLinks: $('#cb_quickMenuOnLinks').checked,
		quickMenuOnImages: $('#cb_quickMenuOnImages').checked,
		quickMenuScale: parseFloat($('#range_quickMenuScale').value),
		quickMenuIconScale: parseFloat($('#range_quickMenuIconScale').value),
		quickMenuOffset: {x: parseInt($('#n_quickMenuOffsetX').value), y: parseInt($('#n_quickMenuOffsetY').value)},
		quickMenuCloseOnScroll: $('#cb_quickMenuCloseOnScroll').checked,
		quickMenuCloseOnClick: $('#cb_quickMenuCloseOnClick').checked,
		quickMenuPosition: $('#h_position').value,
		contextMenuClick: $('#s_contextMenuClick').value,
		contextMenuMiddleClick: $('#s_contextMenuMiddleClick').value,
		contextMenuRightClick: $('#s_contextMenuRightClick').value,
		contextMenuShift: $('#s_contextMenuShift').value,
		contextMenuCtrl: $('#s_contextMenuCtrl').value,
		contextMenuSearchLinksAs: $('#s_contextMenuSearchLinksAs').value,
		contextMenuShowAddCustomSearch: $('#cb_contextMenuShowAddCustomSearch').checked,
		contextMenuShowRecentlyUsed: $('#cb_contextMenuShowRecentlyUsed').checked,
		contextMenuShowRecentlyUsedAsFolder: $('#cb_contextMenuShowRecentlyUsedAsFolder').checked,
		contextMenuShowFolderSearch: $('#cb_contextMenuShowFolderSearch').checked,	
		quickMenuLeftClick: $('#s_quickMenuLeftClick').value,
		quickMenuRightClick: $('#s_quickMenuRightClick').value,
		quickMenuMiddleClick: $('#s_quickMenuMiddleClick').value,
		quickMenuShift: $('#s_quickMenuShift').value,
		quickMenuCtrl: $('#s_quickMenuCtrl').value,
		quickMenuAlt: $('#s_quickMenuAlt').value,		
		quickMenuFolderLeftClick: $('#s_quickMenuFolderLeftClick').value,
		quickMenuFolderRightClick: $('#s_quickMenuFolderRightClick').value,
		quickMenuFolderMiddleClick: $('#s_quickMenuFolderMiddleClick').value,
		quickMenuFolderShift: $('#s_quickMenuFolderShift').value,
		quickMenuFolderCtrl: $('#s_quickMenuFolderCtrl').value,
		quickMenuFolderAlt: $('#s_quickMenuFolderAlt').value,
		quickMenuSearchHotkeys: $('#s_quickMenuSearchHotkeys').value,
		quickMenuSearchHotkeysFolders: $('#s_quickMenuSearchHotkeysFolders').value,
		quickMenuSearchBar: $('#s_quickMenuSearchBar').value,
		quickMenuSearchBarFocus: $('#cb_quickMenuSearchBarFocus').checked,
		quickMenuSearchBarSelect: $('#cb_quickMenuSearchBarSelect').checked,
		quickMenuAutoMaxChars: parseInt($('#n_quickMenuAutoMaxChars').value) || 0,
		quickMenuOpeningOpacity: parseFloat($('#n_quickMenuOpeningOpacity').value) || .3,
		quickMenuAutoTimeout: parseInt($('#n_quickMenuAutoTimeout').value),
		quickMenuAllowContextMenu: !$('#cb_quickMenuAllowContextMenu').checked,
		
		quickMenuOnSimpleClick: {
			enabled: $('#cb_quickMenuOnSimpleClick').checked,
			button: parseInt($('#s_quickMenuOnSimpleClickButton').value),
			alt: $('#cb_quickMenuOnSimpleClickAlt').checked,
			ctrl: $('#cb_quickMenuOnSimpleClickCtrl').checked,
			shift: $('#cb_quickMenuOnSimpleClickShift').checked
		},
		
		contextMenu: $('#cb_contextMenu').checked,

		quickMenuTools: function() {
			let tools = [];
			
			for (let toolIcon of document.getElementsByClassName('toolIcon')) {
				let qmt = userOptions.quickMenuTools.find( _tool => _tool.name === toolIcon.name );
				
				if ( !qmt ) qmt = {"name": toolIcon.name};
				qmt.disabled = toolIcon.disabled;
				
				if ( qmt.name === "lock" ) qmt.persist = $('#cb_quickMenuToolsLockPersist').checked;
				if ( qmt.name === "repeatsearch" ) qmt.persist = $('#cb_quickMenuToolsRepeatSearchPersist').checked;
				
				tools.push(qmt);
			}
	
			return tools;
		}(),
		
		quickMenuToolsPosition: $('#s_quickMenuToolsPosition').value,
		quickMenuToolsAsToolbar: $('#cb_quickMenuToolsAsToolbar').checked,

		searchBarUseOldStyle: $('#s_searchBarDefaultView').value === "text",
		searchBarColumns: parseInt($('#n_searchBarColumns').value),
		searchBarCloseAfterSearch: $('#cb_searchBarCloseAfterSearch').checked,
		
		quickMenuUseOldStyle: $('#s_quickMenuDefaultView').value === "text",
		
		 // take directly from loaded userOptions
		searchBarSuggestions: $('#cb_searchBarSuggestions').checked,
		searchBarEnableHistory: $('#cb_searchBarEnableHistory').checked,
		searchBarHistory: userOptions.searchBarHistory,
		searchBarDisplayLastSearch: $('#cb_searchBarDisplayLastSearch').checked,
		
		sideBar: {
			enabled: userOptions.sideBar.enabled,
			columns:parseInt($('#n_sideBarColumns').value),
			singleColumn:$('#s_sideBarDefaultView').value === "text",
			hotkey: [],
			startOpen: $('#cb_sideBarStartOpen').checked,
			widget: {
				enabled: $('#cb_sideBarWidgetEnable').checked,
				position: $('#s_sideBarWidgetPosition').value,
				offset: userOptions.sideBar.widget.offset
			},
			windowType: userOptions.sideBar.windowType,
			offsets: userOptions.sideBar.offsets,
			position: userOptions.sideBar.position,
			height: userOptions.sideBar.height,
			closeAfterSearch: $('#cb_sideBarCloseAfterSearch').checked,
			rememberState: $('#cb_sideBarRememberState').checked,
			openOnResults: $('#cb_sideBarOpenOnResults').checked,
			openOnResultsMinimized: $('#cb_sideBarOpenOnResultsMinimized').checked
		},
		
		highLight: {
			enabled: $('#cb_highLightEnabled').checked,
			followDomain: $('#cb_highLightFollowDomain').checked,
			followExternalLinks: $('#cb_highLightFollowExternalLinks').checked,
			showFindBar: $('#cb_highLightShowFindBar').checked,
			flashSelected: $('#cb_highLightFlashSelected').checked,
			highlightStyle: $('#s_highLightStyle').value,
			opacity: parseFloat($('#s_highLightOpacity').value),
			
			styles: [
				{	
					color: $('#c_highLightColor0').value,
					background: $('#c_highLightBackground0').value
				},
				{	
					color: $('#c_highLightColor1').value,
					background: $('#c_highLightBackground1').value
				},
				{	
					color: $('#c_highLightColor2').value,
					background: $('#c_highLightBackground2').value
				},
				{	
					color: $('#c_highLightColor3').value,
					background: $('#c_highLightBackground3').value
				}
			],
			activeStyle: {
				color: $('#c_highLightColorActive').value,
				background: $('#c_highLightBackgroundActive').value
			},
			navBar: {
				enabled: $('#cb_highLightNavBarEnabled').checked
			},
			findBar: {
				enabled: $('#cb_findBarEnabled').checked,
				startOpen: $('#cb_findBarStartOpen').checked,
				openInAllTabs: $('#cb_findBarOpenInAllTabs').checked,
				searchInAllTabs: $('#cb_findBarSearchInAllTabs').checked,
				showNavBar: $('#cb_findBarShowNavBar').checked,
				hotKey: $('#d_findBarHotKey').key,
				position: $('#s_findBarPosition').value,
				keyboardTimeout: parseInt($('#n_findBarTimeout').value),
				windowType: $('#s_findBarWindowType').value,
				offsets: userOptions.highLight.findBar.offsets,
				markOptions: {
					separateWordSearch: $('#cb_findBarMarkOptionsSeparateWordSearch').checked,
					ignorePunctuation: $('#cb_findBarMarkOptionsIgnorePunctuation').checked,
					caseSensitive: $('#cb_findBarMarkOptionsCaseSensitive').checked,
					accuracy: $('#s_findBarMarkOptionsAccuracy').value
				}
			},
			markOptions: {
				separateWordSearch: $('#cb_highLightMarkOptionsSeparateWordSearch').checked,
				ignorePunctuation: $('#cb_highLightMarkOptionsIgnorePunctuation').checked,
				caseSensitive: $('#cb_highLightMarkOptionsCaseSensitive').checked,
				accuracy: $('#s_highLightMarkOptionsAccuracy').value
			}
		},
		
		userStyles: $('#t_userStyles').value,
		userStylesEnabled: $('#cb_userStylesEnabled').checked,
		userStylesGlobal: (() => {
			
			let styleText = "";

			let styleEl = document.createElement('style');

			document.head.appendChild(styleEl);

			styleEl.innerText = $('#t_userStyles').value;
			styleEl.sheet.disabled = true;

			let sheet = styleEl.sheet;
			
			if ( !sheet ) return;

			for ( let i in sheet.cssRules ) {
				let rule = sheet.cssRules[i];
				
				if ( /^[\.|#]CS_/.test(rule.selectorText) )
					styleText+=rule.cssText + "\n";
			}
		
			styleEl.parentNode.removeChild(styleEl);
			
			return styleText;
		})(),
	
		enableAnimations: $('#cb_enableAnimations').checked,
		quickMenuTheme: $('#s_searchBarTheme').value,
		searchBarTheme: $('#s_searchBarTheme').value,
		
		searchBarHistoryLength: parseInt($('#n_searchBarHistoryLength').value),
		searchBarSuggestionsCount: parseInt($('#n_searchBarSuggestionsCount').value),
		groupLabelMoreTile: $('#cb_groupLabelMoreTile').checked,
		groupFolderRowBreaks: $('#cb_groupFolderRowBreaks').checked,
		autoCopy: $('#cb_autoCopy').checked,
		autoPasteFromClipboard: $('#cb_autoPasteFromClipboard').checked,
		allowHotkeysWithoutMenu: $('#cb_allowHotkeysWithoutMenu').checked,
		rememberLastOpenedFolder: $('#cb_rememberLastOpenedFolder').checked,
		quickMenuHoldTimeout: parseInt($('#n_quickMenuHoldTimeout').value),
		exportWithoutBase64Icons: $('#cb_exportWithoutBase64Icons').checked,
		addSearchProviderHideNotification: $('#cb_addSearchProviderHideNotification').checked,
		syncWithFirefoxSearch: $('#cb_syncWithFirefoxSearch').checked,
		quickMenuTilesDraggable: $('#cb_quickMenuTilesDraggable').checked,
		recentlyUsedList: userOptions.recentlyUsedList,
		recentlyUsedListLength: parseInt($('#n_contextMenuRecentlyUsedLength').value),
		disableNewTabSorting: $('#cb_disableNewTabSorting').checked,
		contextMenuHotkeys: $('#cb_contextMenuHotkeys').checked,
		quickMenuPreventPageClicks: $('#cb_quickMenuPreventPageClicks').checked,
		openFoldersOnHoverTimeout: parseInt($('#n_openFoldersOnHoverTimeout').value),
		
		pageTiles: {
			enabled: $('#cb_pageTilesEnabled').checked,
			rows: parseInt($('#n_pageTilesRows').value),
			columns: parseInt($('#n_pageTilesColumns').value),
			openMethod: $('#s_pageTilesOpenMethod').value,
			grid: userOptions.pageTiles.grid,
			paletteString: $('#s_pageTilesPalette').value
		}
	}

	var setting = browser.runtime.sendMessage({action: "saveUserOptions", userOptions: userOptions});
	return setting.then(onSet, onError);
}

document.addEventListener("DOMContentLoaded", makeTabs());
document.addEventListener("DOMContentLoaded", restoreOptions);

$('#cb_autoPasteFromClipboard').addEventListener('change', async (e) => {
	
	if ( e.target.checked === true ) {
		e.target.checked = await browser.permissions.request({permissions: ["clipboardRead"]});
		saveOptions();
	}
});

$('#cb_autoCopy').addEventListener('change', async (e) => {
	if ( e.target.checked === true ) {
		e.target.checked = await browser.permissions.request({permissions: ["clipboardWrite"]});
		saveOptions();
	}
});

// listen to all checkboxes for change
document.querySelectorAll("input[type='checkbox'], input[type='color']").forEach( el => {
	el.addEventListener('change', saveOptions);
});

// listen to all select for change
document.querySelectorAll('select').forEach( el => {
	el.addEventListener('change', saveOptions);
});

$('#n_quickMenuColumns').addEventListener('change',  e => {
	fixNumberInput(e.target, 5, 1, 100);
	saveOptions(e);
});

$('#n_quickMenuRows').addEventListener('change',  e => {
	fixNumberInput(e.target, 5, 1, 100);
	saveOptions(e);
});

$('#n_quickMenuRowsSingleColumn').addEventListener('change',  e => {
	fixNumberInput(e.target, 10, 1, 100);
	saveOptions(e);
});

$('#n_quickMenuOffsetX').addEventListener('change', e => {
	fixNumberInput(e.target, 0, -9999, 9999);
	saveOptions(e);
});

$('#n_quickMenuOffsetY').addEventListener('change', e => {
	fixNumberInput(e.target, 0, -9999, 9999);
	saveOptions(e);
});

$('#n_searchBarColumns').addEventListener('change',  e => {
	fixNumberInput(e.target, 4, 1, 100);
	saveOptions(e);
});

$('#n_sideBarColumns').addEventListener('change',  e => {
	fixNumberInput(e.target, 4, 1, 100);
	saveOptions(e);
});

$('#n_quickMenuAutoMaxChars').addEventListener('change',  e => {
	fixNumberInput(e.target, 0, 0, 999);
	saveOptions(e);
});

$('#n_quickMenuAutoTimeout').addEventListener('change',  e => {
	fixNumberInput(e.target, 1000, 0, 9999);
	saveOptions(e);
});

$('#n_findBarTimeout').addEventListener('change',  saveOptions);

$('#n_quickMenuOpeningOpacity').addEventListener('change',  saveOptions);

$('#range_quickMenuScale').addEventListener('input', ev => {
	$('#i_quickMenuScale').value = (parseFloat(ev.target.value) * 100).toFixed(0) + "%";
});
$('#range_quickMenuScale').addEventListener('change', saveOptions);

$('#range_quickMenuIconScale').addEventListener('input', ev => {
	$('#i_quickMenuIconScale').value = (parseFloat(ev.target.value) * 100).toFixed(0) + "%";
});
$('#range_quickMenuIconScale').addEventListener('change', saveOptions);

$('#t_userStyles').addEventListener('change', saveOptions);

$('#cb_userStylesEnabled').addEventListener('change', e => {
	$('#t_userStyles').disabled = ! e.target.checked;
	saveOptions(e);
});

$('#b_quickMenuKey').addEventListener('click', keyButtonListener);
$('#b_contextMenuKey').addEventListener('click', keyButtonListener);

$('#cb_syncWithFirefoxSearch').addEventListener('change', e => {
	$('#searchEnginesParentContainer').style.display = e.target.checked ? "none" : null;
});
document.addEventListener('userOptionsLoaded', e => {
	$('#searchEnginesParentContainer').style.display = $('#cb_syncWithFirefoxSearch').checked ? "none" : null;
});

$('#n_contextMenuRecentlyUsedLength').addEventListener('change', saveOptions);

function keyButtonListener(e) {
	e.target.innerText = '';
	var img = document.createElement('img');
	img.src = 'icons/spinner.svg';
	e.target.appendChild(img);
	e.target.addEventListener('keydown', function(evv) {
	
		if ( evv.key === "Escape" ) {
			e.target.innerText = browser.i18n.getMessage('ClickToSet');
			e.target.value = 0;
		} else {
			e.target.innerText = keyCodeToString(evv.which);
			e.target.value = evv.which;
		}
		
		saveOptions(e);
		
		}, {once: true} // parameter to run once, then delete
	); 
}

function fixNumberInput(el, _default, _min, _max) {

	if (isNaN(el.value) || el.value === "") el.value = _default;
	if (!el.value.isInteger) el.value = Math.floor(el.value);
	if (el.value > _max) el.value = _max;
	if (el.value < _min) el.value = _min;
}

function getKeyString(keys) {
	if ( Array.isArray(keys) ) {
		keys.forEach((key, index) => {
			keys[index] = keyCodeToString(key);
		});
		
		console.log(keys);
	} else {
	}
}

function keyCodeToString(code) {
	if ( code === 0 ) return null;
	
	return keyTable[code] /*|| String.fromCharCode(code)*/ || code.toString();
}

function keyArrayToButtons(arr) {
	
	let div = document.createElement('div');
	
	function makeButton(str) {
		let span = document.createElement('span');
		span.innerText = str;
		span.className = 'keyboardButton';
		span.style = 'min-width:auto;padding:3px 10px;';
		return span;
	}
	
	if ( Array.isArray(arr) ) {
	
		if (arr.length === 0) {
			div.innerText = browser.i18n.getMessage('ClickToSet') || "Click to set";
		}
		
		for (let i=0;i<arr.length;i++) {

			let hk = arr[i]
			let key = keyCodeToString(hk);
			if (key.length === 1) key = key.toUpperCase();
			
			div.appendChild(makeButton(key));
		}
	} else {
		if ( arr.alt ) div.appendChild(makeButton("Alt"));
		if ( arr.ctrl ) div.appendChild(makeButton("Ctrl"));
		if ( arr.meta ) div.appendChild(makeButton("Meta"));
		if ( arr.shift ) div.appendChild(makeButton("Shift"));
		
		div.appendChild(makeButton(arr.key));
	}
	
	let buttons = div.querySelectorAll('.keyboardButton');
	for ( let i=1;i<buttons.length;i++ ) {
		let spacer = document.createElement('span');
		spacer.innerHTML = '&nbsp;&nbsp;+&nbsp;&nbsp;';
		div.insertBefore(spacer, buttons[i]);
	}
	
	return div;
}

// Modify Options for quickload popup
// document.addEventListener('DOMContentLoaded', () => {

	// if (window.location.hash === '#quickload') {
		// history.pushState("", document.title, window.location.pathname);
		
		// document.querySelector('button[data-tabid="enginesTab"]').click();
		// $('#selectMozlz4FileButton').click();
	// }
// });

document.addEventListener('DOMContentLoaded', hashChange);
window.addEventListener('hashchange', hashChange);
	
// switch to tab based on params
function hashChange(e) {	

	let hash = location.hash.split("#");
	
	let buttons = document.querySelectorAll('.tablinks');
	
	// no hash, click first buttony
	if ( !hash || !hash[1] ) {
		buttons[0].click();
		return;
	}
	
	for ( button of buttons ) {
		if ( button.dataset.tabid.toLowerCase() === (hash[1] + "tab").toLowerCase() ) {
			button.click();
			break;
		}
	}
	
}

// Modify Options for BrowserAction
// document.addEventListener("DOMContentLoaded", () => {
	// if (window.location.hash === '#browser_action') {
		// $('#left_div').style.display = 'none';
		// $('#right_div').style.width = "auto";
		// let loadButton = $("#selectMozlz4FileButton");
		// loadButton.onclick = function(e) {
			// browser.runtime.sendMessage({action:"openOptions", hashurl:"#quickload"});
			// e.preventDefault();
		// }
	// }
// });

function makeTabs() {
	
	let tabs = document.getElementsByClassName("tablinks");
	for (let tab of tabs) {
		tab.addEventListener('click', e => {

			for (let tabcontent of document.getElementsByClassName("tabcontent"))
				tabcontent.style.display = "none";

			e.target.getElementsByTagName('img')[0].className = 'fade-in';
				
			// Get all elements with class="tablinks" and remove the class "active"
			for (let tablink of document.getElementsByClassName("tablinks")) 
				tablink.className = tablink.className.replace(" active", "");

			// Show the current tab, and add an "active" class to the button that opened the tab
			document.getElementById(e.target.dataset.tabid).style.display = "block";
			e.currentTarget.className += " active";
			
			location.hash = e.target.dataset.tabid.toLowerCase().replace(/tab$/,"");
		});
	}
//	tabs[0].click();
}

function buildToolIcons() {
	function getToolIconIndex(element) {
		return [].indexOf.call(document.querySelectorAll('.toolIcon'), element);
	}
	function dragstart_handler(ev) {
		ev.currentTarget.style.border = "dashed transparent";
		ev.dataTransfer.setData("text", getToolIconIndex(ev.target));
		ev.effectAllowed = "copyMove";
	}
	function dragover_handler(ev) {
		for (let icon of document.getElementsByClassName('toolIcon'))
			icon.style.backgroundColor='';
		
		ev.target.style.backgroundColor='#ddd';
		ev.preventDefault();
	}
	function drop_handler(ev) {
		ev.preventDefault();
		
		ev.target.style.border = '';
		ev.target.style.backgroundColor = '';
		let old_index = ev.dataTransfer.getData("text");
		let new_index = getToolIconIndex(ev.target);

		ev.target.parentNode.insertBefore(document.getElementsByClassName('toolIcon')[old_index], (new_index > old_index) ? ev.target.nextSibling : ev.target);
	}
	function dragend_handler(ev) {
		ev.target.style.border = '';
		saveOptions();
	}
	
	let toolIcons = [];
	QMtools.forEach( tool => {
		toolIcons.push({name: tool.name, src: tool.icon, title: tool.title, index: Number.MAX_VALUE, disabled: true});
	});

	let modifiedFlag = false;
	toolIcons.forEach( toolIcon => {
		toolIcon.index = userOptions.quickMenuTools.findIndex( tool => tool.name === toolIcon.name );
		// update quickMenuTools array with missing tools
		if ( toolIcon.index === -1) {
			modifiedFlag = true;
			toolIcon.index = userOptions.quickMenuTools.length
			userOptions.quickMenuTools.push({name: toolIcon.name, disabled: true});
		}
		
		toolIcon.disabled = userOptions.quickMenuTools[toolIcon.index].disabled;
	});

	toolIcons = toolIcons.sort(function(a, b) {
		return (a.index < b.index) ? -1 : 1;
	});

	for (let icon of toolIcons) {
		let img = document.createElement('img');
		img.disabled = icon.disabled;
		img.style.opacity = (img.disabled) ? .4 : 1;
		img.className = 'toolIcon';
		img.setAttribute('draggable', true);
		img.src = icon.src;
		img.setAttribute('data-title',icon.title);
		img.name = icon.name;

		img.addEventListener('dragstart',dragstart_handler);
		img.addEventListener('dragend',dragend_handler);
		img.addEventListener('drop',drop_handler);
		img.addEventListener('dragover',dragover_handler);

		img.addEventListener('click',e => {
			e.target.disabled = e.target.disabled || false;
			e.target.style.opacity = e.target.disabled ? 1 : .4;
			e.target.disabled = !e.target.disabled;	
			saveOptions();
		});
		
		let t_toolIcons = $('#t_toolIcons');
		img.addEventListener('mouseover', e => {
			t_toolIcons.innerText = e.target.dataset.title;
		});
		
		img.addEventListener('mouseout', e => {
			t_toolIcons.innerText = browser.i18n.getMessage(t_toolIcons.dataset.i18n);
		});

		$('#toolIcons').appendChild(img);
	}

	if ( modifiedFlag ) {
		console.warn("tools were modified - saving ...");
		saveOptions();
	}
}

document.addEventListener("DOMContentLoaded", () => {
	for (let el of document.getElementsByClassName('position')) {
		el.addEventListener('click', e => {
			for (let _el of document.getElementsByClassName('position'))
				_el.className = _el.className.replace(' active', '');
			el.className+=' active';
			$('#h_position').value = el.dataset.position;
			saveOptions();
		});
		
		let t_position = $('#t_position');
		el.addEventListener('mouseover', e => {
			let parts = e.target.dataset.position.split(" ");
			t_position.innerText = browser.i18n.getMessage("PositionRelativeToCursor").replace("%1", browser.i18n.getMessage(parts[0])).replace("%2",browser.i18n.getMessage(parts[1]));
		});
		
		el.addEventListener('mouseout', e => {
			t_position.innerText = browser.i18n.getMessage(t_position.dataset.i18n);
		});
		
	}
	
});

document.addEventListener("DOMContentLoaded", () => {
	$('#version').innerText = "" + browser.runtime.getManifest().version;
});

// browser-specific modifications
document.addEventListener("DOMContentLoaded", e => {
	if (!browser.runtime.getBrowserInfo) {
		for (let el of document.querySelectorAll('[data-browser="firefox"]'))
			el.style.display = 'none';
	} else {
		browser.runtime.getBrowserInfo().then( info => {
			let version = info.version;
			document.querySelectorAll('[data-browser="firefox"][data-minversion]').forEach( el => {
				if ( el.dataset.minversion > info.version )
					el.style.display = 'none';
			});	
		});
	}
	
	
});

function showInfoMsg(el, msg) {
	let div = $('#info_msg');
		
	let parsed = new DOMParser().parseFromString(msg, `text/html`);
	let tag = parsed.getElementsByTagName('body')[0];
				
	div.innerHTML = null;
	div.appendChild(tag.firstChild);

	div.style.top = el.getBoundingClientRect().top + window.scrollY + 10 + 'px';
	div.style.left = el.getBoundingClientRect().left + window.scrollX + 20 + 'px';
	
	if (el.getBoundingClientRect().left > ( window.innerWidth - 220) )
		div.style.left = parseFloat(div.style.left) - 230 + "px";
	
	div.style.display = 'block';
}

// set up info bubbles
document.addEventListener("DOMContentLoaded", () => {
	
	let i18n_tooltips = document.querySelectorAll('[data-i18n_tooltip]');
	
	for (let el of i18n_tooltips) {
		el.dataset.msg = browser.i18n.getMessage(el.dataset.i18n_tooltip + 'Tooltip') || el.dataset.msg || el.dataset.i18n_tooltip;
		
		el.addEventListener('mouseover', e => {
			showInfoMsg(el, el.dataset.msg);
		});
		
		el.addEventListener('mouseout', e => {
			$('#info_msg').style.display = 'none';
		});
	}
	
	// for (let el of document.getElementsByClassName('info')) {
		// el.addEventListener('mouseover', e => {
			// showInfoMsg(el, el.dataset.msg);
		// });
		
		// el.addEventListener('mouseout', e => {
			// $('#info_msg').style.display = 'none';
		// });
	// }
});

// import/export buttons
document.addEventListener("DOMContentLoaded", () => {
	
	function download(filename, text) {
		var element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);

		element.style.display = 'none';
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);
	}
	
	let b_export = $('#b_exportSettings');
	b_export.onclick = function() {
		
		if ( userOptions.exportWithoutBase64Icons ) {
			let uoCopy = Object.assign({}, userOptions);
			uoCopy.searchEngines.forEach( se => se.icon_base64String = "");
			findNodes(uoCopy.nodeTree, node => {
				if ( node.type === "oneClickSearchEngine" )
					node.icon = "";
			});
			download("ContextSearchOptions.json", JSON.stringify(uoCopy));
		} else {
			download("ContextSearchOptions.json", JSON.stringify(userOptions));
		}
	}
	
	let b_import = $('#b_importSettings');
	b_import.onclick = function() {
		// if (window.location.hash === '#browser_action') {
			// browser.runtime.sendMessage({action: "openOptions", hashurl:"?click=importSettings"});
			// return;
		// }
		$('#importSettings').click();
	}
	
	$('#importSettings').addEventListener('change', e => {
		var reader = new FileReader();

		// Closure to capture the file information.
		reader.onload = () => {
			try {
				let newUserOptions = JSON.parse(reader.result);
				
				// run a few test to check if it's valid
				if ( 
					typeof newUserOptions !== 'object'
					|| newUserOptions.quickMenu === undefined
					|| !newUserOptions.searchEngines
					
				) {
					alert(browser.i18n.getMessage("ImportSettingsNotFoundAlert"));
					return;
				}
				
				// update imported options
				browser.runtime.getBackgroundPage().then( async w => {
					let _uo = await w.updateUserOptionsVersion(newUserOptions);

					_uo = w.updateUserOptionsObject(_uo);
					
					// load icons to base64 if missing
					let overDiv = document.createElement('div');
					overDiv.style = "position:fixed;left:0;top:0;height:100%;width:100%;z-index:9999;background-color:rgba(255,255,255,.85);background-image:url(icons/spinner.svg);background-repeat:no-repeat;background-position:center center;background-size:64px 64px;line-height:100%";
					// overDiv.innerText = "Fetching remote content";
					let msgDiv = document.createElement('div');
					msgDiv.style = "text-align:center;font-size:12px;color:black;top:calc(50% + 44px);position:relative;background-color:white";
					msgDiv.innerText = "Fetching remote content";
					overDiv.appendChild(msgDiv);
					document.body.appendChild(overDiv);
					let sesToBase64 = _uo.searchEngines.filter(se => !se.icon_base64String);
					let details = await loadRemoteIcon({searchEngines: sesToBase64, timeout:10000});
					_uo.searchEngines.forEach( (se,index) => {
						let updatedSe = details.searchEngines.find( _se => _se.id === se.id );
						
						if ( updatedSe ) _uo.searchEngines[index].icon_base64String = updatedSe.icon_base64String;
					});
					
					// load OCSE favicons
					if ( browser.search ) {
						let ocses = await browser.search.get();
						findNodes(_uo.nodeTree, node => {
							if ( node.type === "oneClickSearchEngine" && !node.icon ) {
								let ocse = ocses.find(_ocse => _ocse.name === node.title);	
								if ( ocse ) node.icon = ocse.favIconUrl;
							}
						});
					} else {
						findNodes(_uo.nodeTree, node => {
							if ( node.type === "oneClickSearchEngine" ) node.hidden = true;
						});
					}

					await browser.runtime.sendMessage({action: "saveUserOptions", userOptions: _uo});
					
					userOptions = _uo;
					location.reload();
				});

			} catch(err) {
				alert(browser.i18n.getMessage("InvalidJSONAlert"));
			}
		}

      // Read in the image file as a data URL.
      reader.readAsText(e.target.files[0]);
	});
});

// click element listed in the hash for upload buttons
document.addEventListener('DOMContentLoaded', () => {
	let params = new URLSearchParams(window.location.search);
	
	if (params.has('click')) {
		document.getElementById(params.get('click')).click();
		history.pushState("", document.title, window.location.pathname);
	}
});	

document.addEventListener('DOMContentLoaded', () => {

	function traverse(node) {
		
		if (node.nodeType === 3 && node.nodeValue.trim())
			return node;

		for (let child of node.childNodes) {
			let c = traverse(child);
			if (c) return c;
		}
		
		return false;
	}
	
	let i18n = document.querySelectorAll('[data-i18n]');
	
	for (let el of i18n) {

		let textNode = traverse(el);
		
		if (browser.i18n.getMessage(el.dataset.i18n)) {
			textNode.nodeValue = browser.i18n.getMessage(el.dataset.i18n);
			
			if (el.title === "i18n_text")
				el.title = browser.i18n.getMessage(el.dataset.i18n);
		}

	}

	// add locale-specific styling
	var link = document.createElement( "link" );
	link.href = browser.runtime.getURL('/_locales/' + browser.i18n.getUILanguage() + '/style.css');
	link.type = "text/css";
	link.rel = "stylesheet";
	document.getElementsByTagName( "head" )[0].appendChild( link );
	
	// set up localized help pages
	let help = $('#helpTab');
	
	let loaded = false;
	let iframe = document.createElement('iframe');
	
	iframe.style = 'display:none';
	iframe.onerror = function() {
		console.log('error');
	}
	
	iframe.onload = function() {
		console.log('loaded @ ' + iframe.src);
		var iframeDocument = iframe.contentDocument;
		
		if (!iframeDocument) return;
		
		var iframeBody = iframeDocument.body;
		
		const parser = new DOMParser();
		const parsed = parser.parseFromString(iframeBody.innerHTML, `text/html`);
		
		for (let child of parsed.getElementsByTagName('body')[0].childNodes) {
			help.appendChild(child);
		}

		help.removeChild(iframe);
		
		help.querySelectorAll("[data-gif]").forEach( el => {
			el.addEventListener('click', _e => {
				let div = document.createElement('div');
				div.style = 'position:fixed;top:0;bottom:0;left:0;right:0;background-color:rgba(0,0,0,.8);z-index:2;text-align:center';
				
				div.onclick = function() {
					div.parentNode.removeChild(div);
				}
				
				let img = document.createElement('img');
				img.src = el.dataset.gif;
				img.style.maxHeight = '75vh';
				img.style.marginTop = '12.5vh';
				img.style.maxWidth = '75vw';
					
				img.onload = function() {
					div.appendChild(img);
					el.style.backgroundImage = 'url("' + img.src + '")';
					el.style.backgroundSize = '100% 100%';
				}
				
				help.appendChild(div);
			});
		});
	}
	
	setTimeout(() => {
		if (!loaded) iframe.src = '/_locales/' + browser.runtime.getManifest().default_locale + '/help.html';
	}, 250);
	
	iframe.src = '/_locales/' + browser.i18n.getUILanguage() + '/help.html';
	
	help.appendChild(iframe);

});

document.addEventListener('DOMContentLoaded', () => {
	
	['#d_hotkey', '#d_findBarHotKey'].forEach( id => {
	
		let hk = $(id);
		hk.onclick = function(evv) {
			
			function preventDefaults(e) {
				e.preventDefault();
			}
			
			document.addEventListener('keydown', preventDefaults);
			document.addEventListener('keypress', preventDefaults);
			
			hk.innerHTML = '<img src="/icons/spinner.svg" style="height:1em" /> ';
			hk.appendChild(document.createTextNode(browser.i18n.getMessage('PressKey')));
					
			document.addEventListener('keyup', e => {
				
				e.preventDefault();
				
				if ( e.key === "Escape" ) {
					hk.innerHTML = null;
					hk.appendChild(keyArrayToButtons([]));
					return;
				}
				
				let key = {
					alt: e.altKey,
					ctrl: e.ctrlKey,
					meta: e.metaKey,
					shift: e.shiftKey,
					key: e.key
				}
				
				hk.innerHTML = null;
				hk.appendChild(keyArrayToButtons(key));
				
				hk.key = key;
				
				saveOptions();
				
				document.removeEventListener('keydown', preventDefaults);
				document.removeEventListener('keypress', preventDefaults);
				
			}, {once: true});
			
		}
	});
});
	
document.addEventListener('DOMContentLoaded', () => {
	let div = $('#d_clearSearchHistory');
	div.animating = false;
	div.onclick = function() {
		if (div.animating) return false;
		div.animating = true;
		
		userOptions.searchBarHistory = [];
		saveOptions();
		
		let yes = document.createElement('div');
		yes.className = 'yes';
		yes.style.verticalAlign = 'top';
		div.appendChild(yes);
		
		yes.addEventListener('transitionend', e => {
			div.removeChild(yes);
			div.animating = false;
		});
		
		yes.getBoundingClientRect();
		yes.style.opacity = 0;
	}
});

function showSaveMessage(str, color, _class, el) {

	color = color || "inherit";

	// clear and set save message
	el.innerHTML = null;	
	let msgSpan = document.createElement('span');

	let img = document.createElement('div');
	img.className = _class;
	//img.style.height = img.style.width = '1em';
	img.style.marginRight = '10px';
	msgSpan.style = 'opacity:1;transition:opacity 1s .75s';
	msgSpan.style.color = color;
	msgSpan.innerText = str;
	
	msgSpan.insertBefore(img, msgSpan.firstChild);
	
	el.appendChild(msgSpan);
	
	msgSpan.addEventListener('transitionend', e => {
		msgSpan.parentNode.removeChild(msgSpan);
	});

	msgSpan.getBoundingClientRect(); // reflow
	msgSpan.style.opacity = 0;
}

document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('BUTTON.saveOptions').forEach( button => {
		button.onclick = saveOptions;
	});
});

function makeEmptyGridNode() {	
	return {
		id: null,
		type: "bookmarklet",
		icon: browser.runtime.getURL('/icons/empty.svg'),
		title: ""
	}
}

function makePageTilesGrid() {
	let rows = parseInt($('#n_pageTilesRows').value);
	let cols = parseInt($('#n_pageTilesColumns').value);

	let nodes = findNodes(userOptions.nodeTree, n => ["searchEngine", "oneClickSearchEngine", "bookmarklet", "folder"].includes(n.type));
	
	let gridNodes = [];
	
	userOptions.pageTiles.grid.forEach( g => {
		if ( !g ) 
			gridNodes.push(makeEmptyGridNode());
		else
			gridNodes.push(nodes.find(n => n.id === g));
	});
	
	if ( !gridNodes.length ) gridNodes = nodes;
		
	// let w_ratio = window.screen.width / cols;
	// let h_ratio = window.screen.height / rows;

	let table = $('#pageTilesTable');
	table.innerHTML = null;
	// table.style.setProperty("--width-ratio", w_ratio / h_ratio);
	let i = 0;

	for ( row=0;row<rows;row++) {
		let tr = document.createElement('tr');
		table.appendChild(tr);
		for ( col=0;col<cols;col++ ) {
			let td = document.createElement('td');
			let node = gridNodes[i++];
			
			// outside array bounds
			if ( !node ) node = makeEmptyGridNode();
			
			let icon = getIconFromNode(node);
			
			let img = new Image();
			img.src = icon;
			img.nodeid = node.id;
			
			img.ondragover = function(e) { e.preventDefault();}
			img.ondrop = function(e) {
				e.preventDefault();

				if ( table.contains(window.dragSource) ) {
					let td1 = window.dragSource.parentNode;
					let td2 = img.parentNode;
					
					td2.appendChild(window.dragSource);
					td1.appendChild(img);
				} else {
					img.src = window.dragSource.src;
					img.nodeid = window.dragSource.nodeid;
				}

				saveGrid();
			}
			
			img.ondragstart = function(e) {
				e.dataTransfer.setData("text/plain", node.id);
				e.effectAllowed = "copyMove";
				// e.preventDefault();
				window.dragSource = img;
			}
	
			td.appendChild(img);
			tr.appendChild(td);
		}
	}

}

function saveGrid() {
	let table = $('#pageTilesTable');
	let grid_array = [...table.querySelectorAll('img')].map(i => i.nodeid);

	userOptions.pageTiles.grid = grid_array;
	saveOptions();
}

function makePageTilesPalette() {
	let s = $('#s_pageTilesPalette');
	palettes.forEach( (p,index) => {
		let o = document.createElement('option');
		o.value = p.color;
		o.innerText = p.name;
		s.appendChild(o);
	});

	s.value = userOptions.pageTiles.paletteString;
}

function makePageTilesPaletteSample() {
	let span = $('#pageTilesPaletteSample');
	let s = $('#s_pageTilesPalette');

	span.innerHTML = null;

	let colors = s.value.split('-');
	colors.forEach(c => {
		let cdiv = document.createElement('div');
		cdiv.style = "display:inline-block;width:16px;height:16px;margin:2px";
		cdiv.style.backgroundColor = '#' + c;
		span.appendChild(cdiv);
	});
}

$('#s_pageTilesPalette').addEventListener('change', makePageTilesPaletteSample);

$('#cb_pageTilesEnabled').addEventListener('change', e => {
	if ( !userOptions.pageTiles.grid.length )
		saveGrid();
});

document.addEventListener('userOptionsLoaded', () => {
	
	makePageTilesGrid();
	makePageTilesPalette();
	makePageTilesPaletteSample();
	
	let chooser = $('#pageTilesChooser');
	
	let nodes = findNodes(userOptions.nodeTree, n => ["searchEngine", "bookmarklet", "oneClickSearchEngine", "folder"].includes(n.type));
	
	nodes.push(makeEmptyGridNode());
	
	nodes.forEach(n => {

		if ( n === nodes[0] ) return;

		let img = new Image();
		chooser.appendChild(img);
		img.src = getIconFromNode(n);
		img.height = 16;
		img.width = 16;
		img.style.padding = "2px";
		img.title = n.title;
		img.nodeid = n.id;
		
		img.setAttribute("draggable", "true");

		img.ondragstart = function(e) {
			e.dataTransfer.setData("text/plain", n.id);
			e.effectAllowed = "copyMove";
			// e.preventDefault();
			window.dragSource = img;
		}

		img.ondragend = function(e) {e.preventDefault();}

	});
	
	
});

[$('#n_pageTilesRows'), $('#n_pageTilesColumns')].forEach(el => {
	el.addEventListener('change', e => {
		makePageTilesGrid();
		saveOptions();
	});
});

// generate new search.json.mozlz4 
$("#replaceMozlz4FileButton").addEventListener('change', ev => {
	
	let searchEngines = [];
	let file = ev.target.files[0];
	
	// create backup with timestamp
	exportFile(file, "search.json.mozlz4_" + Date.now() );
	
	readMozlz4File(file, text => { // on success

		// parse the mozlz4 JSON into an object
		var json = JSON.parse(text);	

		let nodes = findNodes(userOptions.nodeTree, n => ["searchEngine", "oneClickSearchEngine"].includes(n.type) );
		
		// console.log(json.engines);
		
		let ses = [];

		nodes.forEach( n => {
			if ( n.type === "searchEngine" ) {
				let se = userOptions.searchEngines.find( _se => _se.id === n.id );
				if ( se ) ses.push(CS2FF(se));
			}
			
			if ( n.type === "oneClickSearchEngine" ) {
				let ocse = json.engines.find( _ocse => _ocse._name === n.title );
				if ( ocse ) ses.push(ocse);
			}
		});

		for ( let i in ses) ses[i]._metaData.order = i;
		
		// console.log(ses);

		json.engines = ses;

		exportSearchJsonMozLz4(JSON.stringify(json));
		
	});
	
	function CS2FF(se) {

		let ff = {
			_name: se.title,
			_loadPath: "[other]addEngineWithDetails",
			description: se.title,
			__searchForm: se.searchForm,
			_iconURL: se.icon_base64String,
			_metaData: {
				alias: null,
				order: null
			},
			_urls: [
				{
					method: se.method,
					params: se.params,
					rels: [],
					template: se.template
				}
			],
			_isAppProvided: false,
			_orderHint: null,
			_telemetryId: null,
			_updateInterval: null,
			_updateURL: null,
			_iconUpdateURL: null,
			_filePath: null,
			_extensionID: null,
			_locale: null,
			_definedAliases: [],
			queryCharset: se.queryCharset.toLowerCase()
		}
		
		return ff;
	}
});

$('#nightmode').addEventListener('click', () => {
	$('#style_dark').disabled = !$('#style_dark').disabled;
})

// (() => {
	// let advancedOptions = [
	// {
		// name: "quickMenuOpeningOpacity",
		// inputOptions: {
			// type: "number",
			// min: 0,
			// max: 1,
			// step:.1
		// }
	// },
	// {	
		// name: "quickMenuAutoMaxChars",
		// inputOptions: {
			// type: "number",
			// min: 0,
			// max: 999,
			// step:1
		// }
	// },
	// {
		// name: "quickMenuAutoTimeout",
		// inputOptions: {
			// type: "number",
			// min: 0,
			// max: 9999,
			// step:1
		// }
	// },
	// {
		// name: "searchBar.historyLength",
		// inputOptions: {
			// type: "number",
			// min: 0,
			// max: 99999,
			// step:1
		// }
	// },
	// {
		// name: "searchBar.suggestionsCount",
		// inputOptions: {
			// type: "number",
			// min: 0,
			// max: 999,
			// step:1
		// }
	// },
	// {
		// name: "quickMenuSearchOnMouseUp",
		// inputOptions: {
			// type: "checkbox"
		// }
	// },
	// {
		// name: "rememberLastOpenedFolder",
		// inputOptions: {
			// type: "checkbox"
		// }
	// },
	// {
		// name: "groupLabelMoreTile",
		// inputOptions: {
			// type: "checkbox"
		// }
	// },
	// {
		// name: "groupFolderRowBreaks",
		// inputOptions: {
			// type: "checkbox"
		// }
	// },
	// {
		// name: "autoCopy",
		// inputOptions: {
			// type: "checkbox"
		// }
	// }
	// ];
	
	// document.addEventListener('DOMContentLoaded', () => {
	// });
 		
	
// // quickMenuTools.lock.persist 	
// // quickMenuTools.repeatsearch.persist 	
 	
 	
	
 	
 	

// })();

