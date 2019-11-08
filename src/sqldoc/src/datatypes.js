var DataTypes = {
    numericTypes: [
        'number',
        'numeric',
        'bigint',
        'smallint',
        'int',
        'int2',
        'int4',
        'int8',
        'int16',
        'int32',
        'int64',
        'float',
        'float2',
        'float4',
        'float8',
        'float16',
        'float32',
        'float64',
    ],

    JSONTypes: [
        'json',
        'jsonb',
    ],

    isNumeric: function(datatype){
        if (typeof(datatype) != "undefined" && datatype != null){
            return (this.numericTypes.indexOf(datatype.toLowerCase()) > -1);
        } else {
            return false;
        }
    },

    isJSON: function(datatype){
        if (typeof(datatype) != "undefined" && datatype != null){
            return (this.JSONTypes.indexOf(datatype.toLowerCase()) > -1);
        } else {
            return false;
        }
    }
}

try{
    module.exports = DataTypes;
} catch(e){
    // skip
}
