Template.table.hasParts = function () {
    return (EtherPlan.Parts.find({doc: Session.get('doc')}).count() > 0);
};

Template.table.parts = function () {
    return EtherPlan.Parts.find({doc: Session.get('doc')}, {
        sort: {
            order: 1
        }
    });;
};

Template.table.hasDoc = function () {
    var doc = EtherPlan.Helper.get_doc();
    if (doc != "") {
        Session.set('doc',doc);
    } else {
        Session.set('doc',null);
    }
    return (doc != "");
}

Handlebars.registerHelper('spaceLabel', function (part) {
    var numSpaces = EtherPlan.LEVELSPACE * part.level;
    var strSpaces = "";
    for (var i = 0; i < numSpaces; i++) {
        strSpaces += "&nbsp;";
    }
    return strSpaces;
});

Handlebars.registerHelper('spaceLabelEntry', function (part) {
    var numSpaces = EtherPlan.LEVELSPACE * part.level;
    var strSpaces = "";
    if (Session.equals('adding_part', this._id)) {
        numSpaces += EtherPlan.LEVELSPACE;
    }
    for (var i = 0; i < numSpaces; i++) {
        strSpaces += "&nbsp;";
    }
    return strSpaces;
});