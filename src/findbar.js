function getSearchBar() { return document.getElementById('searchBar') }

var userOptions = {};
var typeTimer = null;

browser.runtime.sendMessage({action: "getUserOptions"}).then((message) => {
	userOptions = message.userOptions || {};
	
	if ( userOptions === {} ) return;
	
	if ( userOptions.quickMenuTheme === 'dark' ) 
		document.querySelector('#dark').rel="stylesheet";
	
	document.body.dataset.theme = userOptions.quickMenuTheme;
	
	document.querySelector('#toggle_searchalltabs').checked = userOptions.highLight.findBar.searchInAllTabs;
});

document.addEventListener('DOMContentLoaded', (e) => {
	getSearchBar().focus();
	getSearchBar().oldValue = "";

});

function buildMarkOptions() {
	return {
		accuracy: document.querySelector('#accuracy').checked ? "exactly" : "partially",
		caseSensitive: document.querySelector('#caseSensitive').checked,
		ignorePunctuation: document.querySelector('#ignorePunctuation').checked,
		separateWordSearch: document.querySelector('#separateWordSearch').checked
	};
}

window.addEventListener("message", (e) => {

	if ( !typeTimer ) // do not update value if typing in find bar
		getSearchBar().value = e.data.searchTerms || getSearchBar().value || "";	

	if ( typeof e.data.accuracy !== "undefined" ) document.querySelector('#accuracy').checked = ( e.data.accuracy === "exactly" );
	if ( typeof e.data.ignorePunctuation !== "undefined" ) document.querySelector('#ignorePunctuation').checked = e.data.ignorePunctuation;
	if ( typeof e.data.caseSensitive !== "undefined" ) document.querySelector('#caseSensitive').checked = e.data.caseSensitive;
	if ( typeof e.data.separateWordSearch !== "undefined" ) document.querySelector('#separateWordSearch').checked = e.data.separateWordSearch;
	if ( typeof e.data.navbar !== "undefined" ) document.querySelector('#toggle_navbar').checked = e.data.navbar;
	if ( typeof e.data.total !== "undefined" ) document.querySelector('#toggle_marks').checked = ( e.data.total > 0 );

	browser.runtime.sendMessage({action: "findBarUpdateOptions", markOptions: buildMarkOptions()});	
	
	document.getElementById('mark_counter').innerText = browser.i18n.getMessage("FindBarNavMessage", [e.data.index + 1, e.data.total]);
	
	document.querySelectorAll('INPUT[type="checkbox"]').forEach( el => {
		el.disabled = false;
	});

});

document.getElementById('next').addEventListener('click', (e) => {
	browser.runtime.sendMessage({action: "findBarNext", searchTerms: e.target.value});
});

document.getElementById('previous').addEventListener('click', (e) => {
	browser.runtime.sendMessage({action: "findBarPrevious"});
});


getSearchBar().addEventListener('change', (e) => {

	e.target.oldValue = e.target.value;

	if ( e.target.value ) {
		browser.runtime.sendMessage(Object.assign({
			action: "mark", 
			searchTerms: e.target.value, 
			findBarSearch: e.detail ? false : true // detail = true - skip jump to first match
		}, buildMarkOptions()));
		
		document.querySelectorAll('INPUT[type="checkbox"]').forEach( el => {
			el.disabled = true;
		});
	}
	else {
		browser.runtime.sendMessage({action: "unmark"});
		document.getElementById('mark_counter').innerText = browser.i18n.getMessage("FindBarNavMessage", [0, 0]);
	}
});

window.addEventListener('keydown', (e) => {
	
	if ( e.which === 27 ) {
		browser.runtime.sendMessage({action: "unmark"});
		browser.runtime.sendMessage({action: "closeFindBar"});
		return;
	}
	
	if ( [40].includes(e.which) ) {
		browser.runtime.sendMessage({action: "findBarNext"});
		return;
	} else if ( [38].includes(e.which) ) {
		browser.runtime.sendMessage({action: "findBarPrevious"});
		return;
	}
	
});

getSearchBar().addEventListener('keypress', (e) => {
	
	if ( !e.target.value ) return;
	
	// prevent some closing weirdness
	if (e.which === 27 ) return;
	
	if ( e.which === 13 ) {
		if ( e.target.value !== e.target.oldValue )
			getSearchBar().dispatchEvent(new Event('change'));
		else
			browser.runtime.sendMessage({action: "findBarNext"});
		return;
	}

	if ( userOptions.highLight.findBar.keyboardTimeout === 0 || userOptions.highLight.findBar.searchInAllTabs ) return;
	clearTimeout(typeTimer);
	
	typeTimer = setTimeout(() => {
		getSearchBar().dispatchEvent(new Event('change'));
		typeTimer = null;
	}, userOptions.highLight.findBar.keyboardTimeout);
		
});

document.getElementById('close').addEventListener('click', (e) => {
	browser.runtime.sendMessage({action: "closeFindBar"});
	browser.runtime.sendMessage({action: "unmark"});
});

document.addEventListener('DOMContentLoaded', (e) => {
	document.getElementById('mark_counter').innerText = browser.i18n.getMessage("FindBarNavMessage", [0, 0]);
	document.querySelector('#accuracy + LABEL').title = browser.i18n.getMessage('accuracy') || "Accuracy";
	document.querySelector('#caseSensitive + LABEL').title = browser.i18n.getMessage('casesensitive') || "Case Sensitive";
	document.querySelector('#ignorePunctuation + LABEL').title = browser.i18n.getMessage('ignorepunctuation') || "Ignore Punctuation";
	document.querySelector('#separateWordSearch + LABEL').title = browser.i18n.getMessage('separateWordSearch') || "Separate Word Search";
	document.querySelector('#toggle_navbar + LABEL').title = browser.i18n.getMessage('Navbar');
	document.querySelector('#toggle_marks + LABEL').title = browser.i18n.getMessage('highlight');
	document.querySelector('#toggle_searchalltabs + LABEL').title = browser.i18n.getMessage('searchalltabs') || "Search all tabs";
});

document.querySelectorAll('#accuracy,#caseSensitive,#ignorePunctuation,#separateWordSearch').forEach( el => {
	el.addEventListener('click', (e) => {
		getSearchBar().dispatchEvent(new Event('change'));
	//	browser.runtime.sendMessage({action: "findBarUpdateOptions", markOptions: buildMarkOptions()});	// infinite loop 100% cpu
	});
});

document.querySelector('#toggle_marks').addEventListener('change', (e) => {
	if ( e.target.checked )
		getSearchBar().dispatchEvent(new CustomEvent('change', {detail: true})); // detail = true means set findBarSearch = false to skip jump to first match
	else
		browser.runtime.sendMessage({action: "unmark", saveTabHighlighting: true});
});

document.querySelector('#toggle_navbar').addEventListener('change', (e) => {
	browser.runtime.sendMessage({action: "toggleNavBar", state: e.target.checked});
});

document.querySelector('#toggle_searchalltabs').addEventListener('change', (e) => {
	
	// update the object before saving - this frame does not update userOptions automatically
	browser.runtime.sendMessage({action: "getUserOptions"}).then((message) => {
		userOptions = message.userOptions || {};
		userOptions.highLight.findBar.searchInAllTabs = e.target.checked;
		browser.runtime.sendMessage({action: "saveUserOptions", userOptions: userOptions});
		
		// search all tabs if button enabled and searchbar has text
		if ( userOptions.highLight.findBar.searchInAllTabs && getSearchBar().value )
			getSearchBar().dispatchEvent(new Event('change'));
	});
});
