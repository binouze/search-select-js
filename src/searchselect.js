"use strict";

let SearchSelectJS = function( elem )
{
    SearchSelectJS.log('[SSJS] Creating SearchSelectJS', elem);
    SearchSelectJS.staticInit();

    const _this = this;

    this.isOpen       = false;
    this.elem         = elem;
    elem.searchselect = this;

    // on change event
    this.onChange          = null;
    this.lastFilteredInput = '';

    // pour eviter de fermer quand on ouvre, on va garder un timestamp d'ouverture
    this.lastOpen     = 0;

    // un object de remplacement pour le remplissage
    this.fillerObject = elem.dataset.fillerid ? document.getElementById( elem.dataset.fillerid ) : null;
    if( this.fillerObject != null )
    {
        // get the global fill value if defined
        this.globalFillValue = elem.dataset.fillvalue ?? null;

        elem.classList.add('ssjs-hiddenslelect');
        this.fillerObject.addEventListener('click',()=>_this.open())
    }
    else
    {
        this.globalFillValue = null;
    }

    let titre = '';
    if( elem.dataset.title )
    {
        titre = elem.dataset.title;
    }
    else
    {
        // recupérer le label associé a ce champ pour recuperer le titre a afficher
        const label = document.querySelector("label[for='" + elem.id + "']")
        SearchSelectJS.log("[SSJS] LABEL:", label, label?.innerText);
        titre = label?.innerText ?? '';
    }

    // créer le popup liste

    // le conteneur
    this.container = document.createElement('div');
    this.container.classList.add('ssjs-container');
    document.body.prepend(this.container);

    // le popup
    this.popup = document.createElement('div');
    this.popup.classList.add('ssjs-popup');
    this.container.appendChild(this.popup);

    // le titre
    this.titre = document.createElement('div');
    this.titre.classList.add('ssjs-title');
    this.titre.innerHTML = titre;
    this.popup.appendChild(this.titre);

    // le bouton close
    this.btnClose = document.createElement('div');
    this.btnClose.innerHTML = "&times;";
    this.btnClose.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M24 20.188l-8.315-8.209 8.2-8.282-3.697-3.697-8.212 8.318-8.31-8.203-3.666 3.666 8.321 8.24-8.206 8.313 3.666 3.666 8.237-8.318 8.285 8.203z"/></svg>';
    this.btnClose.classList.add('ssjs-btnClose');
    this.popup.appendChild(this.btnClose);

    // le text-input (search field)
    this.searchinput = document.createElement('input');
    this.searchinput.setAttribute("type", "text");
    this.searchinput.classList.add('ssjs-searchinput');
    this.searchinput.classList.add('form-control');
    this.popup.appendChild(this.searchinput);

    // la liste
    this.liste = document.createElement('div');
    this.liste.classList.add('ssjs-list');
    this.popup.appendChild(this.liste);

    // les elements de la liste
    this.items         = [];
    this.selectedValue = null;
    this.selectedItem  = null;
    for( const option of elem.options )
    {
        const itm = document.createElement('div');
        itm.classList.add('ssjs-item');
        this.liste.appendChild(itm);

        const ssjs_itm = new SearchSelectJS_item(itm,option,_this);
        this.items.push(ssjs_itm);
    }

    // les events

    // le bouton close
    this.btnClose.addEventListener("click", () => _this.close());

    // afficher le popup si on clique sur l'element select
    this.elem.addEventListener("keydown",    e => _this.preventOppenningSelect(e,_this));
    this.elem.addEventListener("mousedown",  e => _this.preventOppenningSelect(e,_this));
    this.elem.addEventListener("touchstart", e => _this.preventOppenningSelect(e,_this));
    this.elem.addEventListener("focus",      e => _this.preventOppenningSelect(e,_this));

    // si on clique en dehors, on referme
    this.container.addEventListener("click", e => _this.bgClicked(e,_this) );
    // le text input pour filtrer
    this.searchinput.addEventListener("keyup", () => _this.filter() );
    // forcer un filtrage qand on quitte l'input
    this.searchinput.addEventListener("blur", () => _this.filter() );

    // navigation au clavier
    window.addEventListener('keydown', e => _this.onkeydown(e,_this));

    // maj item list
    this.majSelection();
}

SearchSelectJS.scrollAtOpen = 0;
SearchSelectJS.backdrop    = null;
SearchSelectJS.enable_logs = true;
SearchSelectJS.isInit      = false;
SearchSelectJS.staticInit  = function(){

    if( SearchSelectJS.isInit )
        return;
    SearchSelectJS.isInit = true;


    SearchSelectJS.backdrop = document.createElement('div');
    SearchSelectJS.backdrop.classList.add('ssjs-backdrop');
    document.body.appendChild(SearchSelectJS.backdrop);

    setInterval(SearchSelectJS.onResize,100);
}
SearchSelectJS.log = function(...args){
    if( SearchSelectJS.enable_logs )
        console.log(...args);
}
SearchSelectJS.current = null;
SearchSelectJS.lastHeight = 0;
SearchSelectJS.onResize = function()
{
    // For the rare legacy browsers that don't support it
    if( !window.visualViewport )
        return

    const height = window.visualViewport.height;
    if( height !== SearchSelectJS.lastHeight )
    {
        console.log(window.visualViewport.height);

        const r = document.querySelector(':root');
        r.style.setProperty('--viewporHeight', `${height}px`);

        SearchSelectJS.lastHeight = height;
    }
}
SearchSelectJS.prototype.preventOppenningSelect = function( e, _this )
{
    SearchSelectJS.log('[SSJS] preventOppenningSelect !!', e);

    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.target.blur();

    if( _this.fillerObject == null )
        _this.open();
}

/**
 * Définir la valeur selectionnée du champ select
 * @param selectedValue
 */
SearchSelectJS.prototype.setValue = function( selectedValue )
{
    SearchSelectJS.log('[SSJS] setValue', selectedValue);

    if( selectedValue !== this.selectedValue || selectedValue !== this.elem.value )
    {
        this.selectedValue = selectedValue;
        this.elem.value    = selectedValue;
        this.updateItems();
        this.onSelected(this.selectedItem,true);
    }
}

/**
 * Récupérer la valeur selectionnée du champ select
 * @return string
 */
SearchSelectJS.prototype.getValue = function()
{
    return this.selectedValue;
}

/**
 * Quand on clique en dehors dun popup, si le popup est ouvert, on le referme
 */
SearchSelectJS.prototype.bgClicked = function(e, _this)
{
    if( e.target !== _this.container )
        return;

    if( _this.isOpen )
        _this.close();
}

SearchSelectJS.prototype.onkeydown = function(e, _this)
{
    if( !this.isOpen )
        return;

    SearchSelectJS.log('[SSJS] onKeyDown',e.key);

    // si le search field n'est pas actuellement focus, on lui donne le focus
    if( _this.searchinput !== document.activeElement )
        _this.searchinput.focus();

    if( e.key === 'Enter' )
        _this.validate();
    else if( e.key === 'ArrowDown' )
        _this.next();
    else if( e.key === 'ArrowUp' )
        _this.previous();
    else if( e.key === 'Escape' )
        _this.close();
}

/**
 * ouvrir le popup
 */
SearchSelectJS.prototype.open = function()
{
    SearchSelectJS.log('[SSJS] open', this.isOpen);

    if( this.isOpen === true )
        return;

    this.lastOpen = new Date().getTime();
    this.isOpen   = true;

    SearchSelectJS.current      = this;
    SearchSelectJS.scrollAtOpen = document.documentElement.scrollTop;

    this.resetFilter();
    this.majSelection();
    this.updateItems();

    SearchSelectJS.onResize();

    if( !this.container.classList.contains('ssjs-show') )
        this.container.classList.add('ssjs-show');

    if( !SearchSelectJS.backdrop.classList.contains('ssjs-show') )
        SearchSelectJS.backdrop.classList.add('ssjs-show');

    if( this.selectedItem != null )
        this.selectedItem.elem.scrollIntoView();
    else
        this.liste.scrollTo(0,0);

    console.log('scrolintoview' );

    this.searchinput.focus();

    const body = document.body;
    if( !body.classList.contains('ssjs-open') )
        body.classList.add('ssjs-open');
}

/**
 * fermer le popup
 */
SearchSelectJS.prototype.close = function()
{
    const t = new Date().getTime();
    if( t - this.lastOpen < 100 )
        return;

    if( !this.isOpen )
        return;

    this.isOpen = false;
    this.container.classList.remove('ssjs-show');

    SearchSelectJS.backdrop.classList.remove('ssjs-show');

    const body = document.body;
    body.classList.remove('ssjs-open');

    SearchSelectJS.current = null;
    document.documentElement.scrollTop = SearchSelectJS.scrollAtOpen;
    console.error('scrollTop');
}

/**
 * ouvrir si c'est fermé, sinon fermer
 */
SearchSelectJS.prototype.toggle = function()
{
    SearchSelectJS.log('[SSJS] toggle');

    if( this.isOpen ) this.close();
    else              this.open();
}

/**
 * mise à jour apres selection
 */
SearchSelectJS.prototype.updateItems = function()
{
    let i = 0;
    for( const item of this.items )
    {
        if( item.value !== this.selectedValue )
        {
            item.uncheck();
        }
        else
        {
            item.check();
            this.selectedItem       = item;
            this.navigationElemActu = item;
            this.navigationActu     = i;
        }

        i++;
    }
}


/**
 * mise à jour avant ouverture
 */
SearchSelectJS.prototype.majSelection = function()
{
    const val = this.elem.value;
    SearchSelectJS.log('[SSJS] majSelection', val);
    this.setValue( val );
}

/**
 * mise à jour apres selection
 */
SearchSelectJS.prototype.onSelected = function( item, force )
{
    SearchSelectJS.log('[SSJS] onSelected', item.value, this.selectedValue, force );

    if( this.selectedValue !== item.value || force === true )
    {
        this.setValue( item.value );

        // call on change event handler if defined
        if( this.onChange != null )
            this.onChange( this.getValue() );

        if( this.fillerObject != null )
            this.fillerObject.innerHTML = item.fillValue;
    }

    // fermer le popup quand on select
    this.close();
}

/*** FILTERING ***/


/**
 * appliquer le filtre lorsque le textInput change
 */
SearchSelectJS.prototype.filter = function()
{
    const txt = this.searchinput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if( this.lastFilteredInput === txt )
        return;

    this.maxItemActu = 0;
    SearchSelectJS.log('[SSJS] filter', txt );
    for( const item of this.items )
    {
        if( txt.length === 0 || item.text.includes(txt) )
        {
            this.maxItemActu++;
            item.show();
        }
        else
        {
            item.hide();
        }
    }

    this.lastFilteredInput = txt;
}


/**
 * appliquer le filtre lorsque le textInput change
 */
SearchSelectJS.prototype.resetFilter = function()
{
    SearchSelectJS.log('[SSJS] resetFilter' );
    this.searchinput.value  = '';
    this.navigationElemActu = null;
    this.maxItemActu        = this.items.length;
    this.filter();
}

// NAVIGATION AU CLAVIER


SearchSelectJS.prototype.navigationActu     = -1;
SearchSelectJS.prototype.navigationElemActu = null;

/**
 * selectionner l'item suivant (sans fermer)
 */
SearchSelectJS.prototype.next = function()
{
    SearchSelectJS.log( '[SSJS] next', this.navigationElemActu, this.navigationActu, this.maxItemActu );

    if( this.navigationElemActu != null && this.navigationElemActu.isShow )
        this.navigationActu++;
    else
        this.navigationActu = 0;

    if( this.navigationActu > this.maxItemActu )
        this.navigationActu = this.maxItemActu;

    this.majNavigation();
}
/**
 * selectionner l'item precedent (sans fermer)
 */
SearchSelectJS.prototype.previous = function()
{
    SearchSelectJS.log( '[SSJS] previous', this.navigationElemActu, this.navigationActu, this.maxItemActu );

    if( this.navigationElemActu != null && this.navigationElemActu.isShow )
        this.navigationActu--;
    else
        this.navigationActu = 0;

    if( this.navigationActu < 0 )
        this.navigationActu = 0;

    this.majNavigation();
}
/**
 * selectionner l'item precedent (sans fermer)
 */
SearchSelectJS.prototype.majNavigation = function()
{
    SearchSelectJS.log( '[SSJS] majNavigation',this.navigationActu );

    this.navigationElemActu = null;
    let i= 0;
    for( const item of this.items )
    {
        if( !item.isShow )
        {
            continue;
        }

        if( i === this.navigationActu )
        {
            this.navigationElemActu = item;
            item.check();
            item.elem.scrollIntoView({
                behavior: 'auto',
                block:    'center',
                inline:   'center'
            });
            console.log('scrolintoview' );

            SearchSelectJS.log( '[SSJS] majNavigation selecting', item.text );
        }
        else
        {
            item.uncheck();
        }
        i++;
    }
}
/**
 * valider l'item selectionné + fermer
 */
SearchSelectJS.prototype.validate = function()
{
    SearchSelectJS.log('[SSJS] validate' );
    if( this.navigationElemActu !== null && this.navigationElemActu.isShow )
    {
        this.onSelected(this.navigationElemActu);
    }
}

// ITEMS

let SearchSelectJS_item = function( elem, option, parent )
{
    const _this = this;

    this.parent = parent;
    this.elem   = elem;
    this.text   = option.innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    this.isShow = true;
    this.value  = option.value;

    let txt =  option.innerText;

    let prefix = '';
    let suffix = '';
    if( option.dataset.prefix )
    {
        prefix = urldecode(option.dataset.prefix);
        txt    = prefix + txt;
    }
    if( option.dataset.suffix )
    {
        suffix = urldecode(option.dataset.suffix);
        txt    = txt + urldecode(option.dataset.suffix);
    }

    let fillval = option.dataset.fillvalue ?? parent.globalFillValue;
    if( fillval )
    {
        let fillvalue = urldecode(fillval);
        this.fillValue = fillvalue.replace('{prefix}',prefix).replace('{suffix}',suffix).replace('{txt}',txt);
    }
    else
    {
        // par defaut on met le meme texte que dans la liste
        this.fillValue = txt;
    }

    // set item text
    elem.innerHTML = txt;

    // listen for select event
    elem.addEventListener("click", () =>
    {
        _this.check();
        _this.parent.onSelected(_this);
    });
};

function urldecode(url) {
    return decodeURIComponent(url.replace(/\+/g, ' '));
}

SearchSelectJS_item.prototype.show = function()
{
    this.isShow = true;
    this.elem.classList.remove("ssjs-hidden");
}
SearchSelectJS_item.prototype.hide = function()
{
    this.isShow = false;
    if( !this.elem.classList.contains("ssjs-hidden") )
        this.elem.classList.add("ssjs-hidden");
}

SearchSelectJS_item.prototype.check = function()
{
    if( !this.elem.classList.contains("ssjs-selected") )
        this.elem.classList.add("ssjs-selected");
}

SearchSelectJS_item.prototype.uncheck = function()
{
    this.elem.classList.remove("ssjs-selected");
}

// AUTO INITIALIZE


// on document is loaded, transform elements with searchselect-js class into SearchSelectJS elements
document.addEventListener("DOMContentLoaded", () =>
{
    SearchSelectJS.log('[SSJS] SearchSelectJS DOMLOaded !');
    document.querySelectorAll('select.searchselect-js').forEach( (el) =>
    {
        SearchSelectJS.log('[SSJS] new SearchSelectJS ', el);
        new SearchSelectJS(el);
    });
});