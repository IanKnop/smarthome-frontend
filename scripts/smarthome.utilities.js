/*  =========================================================
    KNOP.FAMILY
    Smart Home UI - Utility Functions
   
    (C) 2020 by Ian Knop, Weiterstadt, Germany
    www.knop.family
    ========================================================= */

function toBool(variantValue) {

    /* toBool()___________________________________________________________
    Transform variant value types to valid boolean value                 */

    if (typeof variantValue === 'boolean') return variantValue;
    else if (variantValue.toString().toLowerCase() == 'true' || variantValue.toString() == '1') return true;
    else return false;

}

function hasClass(target, targetClass) {
    return document.getElementById(target).classList.contains(targetClass);
}

function addClass(target, targetClass) {
    document.getElementById(target).classList.add(targetClass);
}

function removeClass(target, targetClass) {
    document.getElementById(target).classList.remove(targetClass);
}

function getVar(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName);
}

function isJSONString(str) {
    
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
    
}

function isField(source) {

    /* isField()_____________________________________________________________
    Returns if value is Smarthome UI field name {{[...]}}')                 */ 

    return (source.trim().startsWith('{{[') && source.trim().endsWith(']}}')) || (source.trim().startsWith('{[') && source.trim().endsWith(']}'));

}

function getFieldName(source) {

    /* getFieldName()________________________________________________________
    Returns Smarthome UI field name from string                             */ 

    if (source.trim().startsWith('{{[') && source.trim().endsWith(']}}')) return source.trim().substr(3, source.trim().length - 6);
    else if (source.trim().startsWith('{[') && source.trim().endsWith(']}')) return source.trim().substr(2, source.trim().length - 4);
    else if (source.trim().startsWith('{(') && source.trim().endsWith(')}')) return source.trim().substr(2, source.trim().length - 4);
    else return source;

}

function replaceComma(inputString) {

    /* replaceComma()________________________________________________________
    Changes number value string to German format                            */ 

    return (inputString != null ? inputString.toString().replace(/,/g , "__COMMA__").replace(/\./g, ',').replace(/__COMMA__/g, '.') : 0);
}

function urlDecode(inputString) {

    /* urlDecode()________________________________________________________
    Decodes PHP encoded url string                                       */
    
    return decodeURIComponent(inputString.replace(/\+/g, ' '));
}

function htmlEntities(inputString) {

    return String(inputString).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

}

function setDimensions(target, top, left, height, width) {

    /* setDimensions()____________________________________________________
    Set location and size of element                                     */

    target.style.height = height;
    target.style.width = width;
    target.style.top = top;
    target.style.left = left;

}

function mergeObjects(objectExist, objectAdd) {

    /* mergeObjects()____________________________________________________
    Merges properties of two objects                                    */

    var returnObject = Object.assign({}, objectExist);

    Object.keys(objectAdd).forEach(key => {

        if (returnObject[key] == undefined || returnObject[key] == null || typeof returnObject[key] !== 'object') returnObject[key] = objectAdd[key];
        else returnObject[key] = mergeObjects(returnObject[key], objectAdd[key]);

    });
    
    return returnObject;

}

