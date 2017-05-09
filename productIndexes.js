/*
*
* MongoDB Index maintenance script
*
* This is a sample script to craate and maintain the indexes
* on the EN_All_All.product collection.
*
* Last Update: May 9, 2017
* By: Jason Mimick
*
*/
print("product index maintentance script starting: " + new Date());

var indexesArePresentByName = function(collection, indexNames) {
  indexNames.forEach( function(iname) {
    if (!indexIsPresentByName(collection,iname)) {
      print("Collection: " + collection + " is missing index: " + iname);
      return false;
    }
  });
  return true;
}

var indexIsPresentByName = function(collection, indexName) {
 var indexes = db.getCollection(collection).getIndexes();
 return indexes.map( function(i) { return i.name } ).filter( function(i) { return i==indexName } ).length != 1
}

// Ensure we are in the correct database
var db = db.getSiblingDB("EN_All_All");

// Check what indexes are already defined on the product collection
var indexes = db.product.getIndexes();

// we expect only index on _id named: "_id_"
if ( !indexIsPresentByName("product","_id_")) {
  print("Detected missing \"_id\" indexes or other indexes present. Please check system.");
  quit();
}

print("product index maintentance script creating { \"objectTypeID\":1,\"values.FLD_eCatalog Product Detail\"} index in background: " + new Date());

db.product.createIndex( { "objectTypeID" : 1, "values.FLD_eCatalog Product Details" : 1 },
                        { "background" : true } );

var expectedIndexNames = [ "_id_", "objectTypeID_1_values.FLD_eCatalog Product Details_1" ];
print("Validating correct indexes: " + JSON.stringify( expectedIndexNames) );
indexesArePresentByName("product",expectedIndexNames);

print("product index maintentance script complete" + new Date());


