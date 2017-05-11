/*
* Example Mongo shell script which creates
* a new collection called "product.facets" from 
* the "product" collection generated by Stibo.
*
* The motivation is to be able to effeciently search
* on arbitrary "values" for products. The Stibo adapter
* generates product documents with various keys in the 
* "values" array. Since these are different for different
* products, we cannot index each possible key name in the 
* "values" array - plus new products could have values.key's
* which don't even exist yet.
* 
* This sample demonstrates the concept of faceted search where
* we'll convert a strcuture like this:
*
* { ...
*     "values" : { "someKey1" : "someValue1",
*                  "someKey2" : "someValue2",
*                  ...,
*                  "someKeyn" : "someValuen" }
*   ...
* }
*
* for a product document into this:
* { "_id" : <same _id as product collection>,
*   "facets" : [ { "k" : "someKey1", "v" : "someValue1" },
*                { "k" : "someKey2", "v" : "someValue2" },
*                ...,
*                { "k" : "someKeyn", "v" : "someValuen" } ]
* }
* 
* and we create an index on:
* { "facets.k" : 1, "facets.v" : 1 }
*
*/

db = db.getSiblingDB("ferguson");

db.product.facets.drop();


var inserts = [];	// we'll batch up 1000 inserts
                        // to use bulk loading

var numProducts = db.product.count({ "objectTypeID" : "Product" });

let start = new Date().getTime();
var products = db.product.find( { "objectTypeID" : "Product" },
                                { "values" : 1 });

var numProductsWithoutValues = 0;
let result = {};

while ( products.hasNext() ) {
	if ( inserts.length==1000 ) {
		result = db.product.facets.bulkWrite(inserts,
                                                     { "unordered" : true } );
		if ( result.writeErrors && result.writeErrors.length>0 ) {
			printjson(result);
		}
		inserts.length = 0;    // reset inserts array
	}
	var product = products.next();
	if ( !product.values ) {
		numProductsWithoutValues++;	
		continue;
	}
	var valueKeys = Object.keys(product.values);
	let facets = valueKeys.map( function(k) { 
		return { "k" : k, "v" : product.values[k] };
	});
	let facetValues = valueKeys.map( function(k) {
		return product.values[k];
	});
	inserts.push( { "insertOne" : { "document" : 
			{ "_id" : product._id, "facets" : facets, "facetValues" : facetValues } 
                      } } );
}
let end = new Date().getTime();

result = db.product.facets.createIndex( { "values.k" : 1, "values.v" : 1 },
                                            { "background" : true } );
printjson(result);
result = db.product.facets.createIndex( { "values.v" : 1 },
                                        { "background" : true } );
printjson(result);
print("product.facets collection done, runtime = " + (end-start));
	
let numProductFacets = db.product.facets.count();

print("number of products = " +  numProducts);
print("number of product.facets = " +  numProductFacets);
print("number of products without values = " +  numProductsWithoutValues);
