/*
* Examples of 'lookups' with Product
* data in MongoDB
*
*/
function lookupListOfValue(key) {
   // if the key isn't the correct format
   // just return it, we can't do the lookup
   if ( key.indexOf("Eco_") != 0 ) {
	return key;
   }
   let parsedKey = key.split("_")
   let lovId = parsedKey[0] + "_LOV_" + parsedKey[1];
   let query = { "_id" : lovId };
   let projection = { "_id" : 0, "name" : 1 };
   let lovKey = db.listofvalues.findOne(query,projection);
   if ( lovKey ) {
      return lovKey.name;
   } else {
      return key;   // can't find
   }
}
function convertProduct(product) {
    let valueKeys = Object.keys(product.values);
    let convertedValueKeys = {};
    // This builds a map from the internal key name to
    // the looked up name
    valueKeys.forEach( function(key) {
        convertedValueKeys[key] = lookupListOfValue(key);
    })
    let keysToRemove = [];
    Object.keys(product.values).forEach( function(key) {
        let value = product.values[key];
        let newKey = lookupListOfValue(key);
        product.values[newKey] = value;
        if ( newKey != key ) {
            keysToRemove.push(key);
        }
    })
    // Now remove the keys we've replaced
    keysToRemove.forEach( function(key) {
        delete product.values[key];
    })
    return product;
}


let product = db.product.findOne({"objectTypeID":"Product"});
printjson(product);
printjson(convertProduct(product));

