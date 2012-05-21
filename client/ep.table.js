EtherPlan.Action.addLast = function (evt) {
    var numParts = EtherPlan.Parts.find({doc: Session.get('doc')}).count();
    var lastRow = EtherPlan.Parts.findOne({doc: Session.get('doc')}, {
        sort: {
            order: -1
        }
    });
    if (numParts == 1) {
        Session.set('adding_part', lastRow._id);
    } else {
        Session.set('adding_brother_part', lastRow._id);
    }
    Session.set('editing_part', null);
}


Template.table.docId = function () {
    return Session.get('doc');
};

Template.table.hasParts = function () {
    return (EtherPlan.Parts.find({doc: Session.get('doc')}).count() > 0);
};

Template.table.parts = function () {
    return EtherPlan.Parts.find({doc: Session.get('doc')}, {
        sort: {
            order: 1
        }
    });
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

Template.table.noDoc = function () {
    return (!Template.table.hasDoc());
}

Template.table.noParts = function () {
    return (!Template.table.hasParts());
}

Handlebars.registerHelper('spaceLabel', function (part) {
    var numSpaces = EtherPlan.LEVELSPACE * part.level;
    var strSpaces = "";
    for (var i = 0; i < numSpaces; i++) {
        strSpaces += "&nbsp;";
    }
    return strSpaces;
});

Handlebars.registerHelper('depend', function (part) {
    var predecessors = part.predecessors;
    return EtherPlan.Helper.get_depend(predecessors);
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

Template.table.events = {
    'click #iconActionPlusDefault': EtherPlan.Action.addLast
};


