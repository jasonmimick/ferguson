Lookups for Ferguson Product Data with MongoDB
==============================================
<sub>By Jason Mimick, MongoDB</sub>

This article will describe how to perform "lookup"-type
operations for the product data stored in MongoDB.

The product data in MongoDB carry over certain structures
from the source Stibo system. This includes some keys or values
which actually are pointers to documents in other collections.
For example, each product in the ``product`` collection has a key
called ``values`` which is an embedded document:

```javascript
{
    "_id" : "Prod-663859",
    "objectTypeID" : "Product",
    "references" : {
        "FOL Link" : {
            "targetID" : "webfolder-296",
            "values" : {
                "Use for ECatalog" : "Yes"
            }
        },
        "XPC_DISC．GROUP" : {
            "targetID" : "CF_FERGUSON_DISC.GROUP_3504"
        },
    ...
    },
    "values" : {
        "MP_PROD_LONG_DESC" : "6 Round IRR Valve Box With Lid",
        "MP_DISC_GROUP_ID" : "3504",
        "PW_DISC_PCT" : "0.0000",
        "ImportBatchID" : "ABD-PRICEUPDATE-NDS-010117",
        "MP_DEPT_CODE_DESC" : "WATERWORKS - OTHER",
        "PFC_Vendor_Formatted" : "1",
        "STEP_CREATE_DATE" : "09/02/2015",
        ...
        "MP_DEPT_CODE" : "62",
        "Eco_365" : "6",
        "Web Display Name" : "6 in. Round Irrigation Valve Box with Lid",
        "ECAT_ANSI UOM" : "EA",
        "Product_Override_Block_Header" : "VALVE BOXES",
        "eComm Import ID" : [
            "Platform SKUs",
            "Ph2 Cut 8"
        ],
        "MP_ALT_CODE" : "ND109B||||",
        "PW_PREVIOUS_PRICE" : "14.15",
        "MP_S_MASTER．PRODUCT" : "3143775",
        "MP_UOM" : "EA",
        "Eco_1717" : "Valve Box",
        "PW_PRICE" : "14.59|14.15",
        "STEP_UPDT_DATE" : "05/01/2017",
        "FLD_Brand Names" : "National Diversified Sales",
        "INT_MFG_PART_NUM" : "D109-B",
        "MP_PRIM_VENDOR_ID" : "1625",
        "Eco_1820" : "1.21",
        "eComm Temp ID" : "Base Model Cut 8 Temp ID",
        ...
        "Eco_226" : [
            "Black"
        ],
        "INT_S_INTEG．LOC．PRODUCT" : "3143775",
        "MP_DISC_GROUP_ID_DESC" : "NDS METER BOX, CVR & LID ( 20ME)",
        "Web Display Type" : "Drop-down",
        "GPH Full Path" : " Primary Product Hierarchy| Ferguson| Global Product Hierarchy|21 WATER WORKS|02 HYDRANTS, VALVES, PARTS AND ACCESSORIES|01 BOXES, PARTS AND ACCESSORIES|11 VALVE BOXES|11 Round Irrigation Valve Box with Lid|11 ND109B 6 RND IRR VLV BX W/LID|",
        "FLD_Base Model Number" : "ND109B",
        "PFC_Step_ID" : "Prod-663859"
    },
    "name" : "ND109B 6 RND IRR VLV BX W/LID",
    "type" : "product",
    "parentID" : "ProdFamily-277577"
}  
```
(some keys have been omitted for brevity)

Note the ``values`` sub-document has some key-names like ``Eco_226`` or 
``Eco_365``. These key-names are referring to documents in the ``listofvalues``
collection:

```javascript
db.listofvalues.find({"_id":"Eco_LOV_226"})
{ "_id" : "Eco_LOV_226", "name" : "Color/Finish Name - FEI", "type" : "listofvalues" }
```

This tells us that the key ``Eco_226`` really means color. The convention is that the string
``LOV_`` is inserted between the ``Eco_`` and ``226``. So we can write a function
to perform this lookup given a particular ``values`` key-name:

```javascript
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
```
We can now create a *human* version of a product like this:

```javascript
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
```

And we can test these functions with something like:

```javascript
let product = db.product.findOne({"objectTypeID":"Product"});
printjson(product);
printjson(convertProduct(product));
```

Now, one may be tempted to try and use the aggregation framework
``$lookup`` operator. This problem, however, isn't quiet suited for
that operator since we don't know a priori the names of the ``Eco_`` keys.
If these were some fixed set value for each document, then an aggregation
could do this kind of transformation. Since this this type of conversion
may be neccessary it may be worthwhile to investigate alternative
mapping techniques in the STEP adapater. For example, is it possible
to just export the external values rather than the {{Eco_123}}-type 
values? Are the internal values required for any particular business
functionality?

If the looked-into collection is small, appications may wish to actually
cache a map of internal to external values in memory to reduce roundtrips
to the database.

The code examples in this article are available to download at test: 
[LookupSampleCode.js](LookupSampleCode.js)