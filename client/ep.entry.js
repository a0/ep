EtherPlan.Action.entry = function (text, evt) {
    var parent = document.getElementById('entryParent');
    var label = document.getElementById('entryLabel');
    var value = document.getElementById('entryValue');
    var start = document.getElementById('entryStart');
    var finish = document.getElementById('entryFinish');
    var predecessors = document.getElementById('entryPredecessors');

    var objParent = EtherPlan.Parts.findOne(parent.value);
    var level = objParent.level;
    var order = objParent.order + 1;

    if (Session.equals('adding_brother_part', parent.value)) {
        order = EtherPlan.Helper.find_last_leaf(objParent).order + 1;
        objParent = EtherPlan.Parts.findOne(objParent.parent);
    }

    if (Session.equals('adding_part', parent.value)) {
        level = objParent.level + 1;
    }

    var changes = [];
    EtherPlan.Parts.find({doc: Session.get('doc'), order: {$gte: order}}, {sort: {order: 1}}).forEach(function (part) {
        var newOrder = parseInt(part.order + 1);
        changes.push({
            id: part._id,
            newOrder: newOrder
        });
    });
    for (var i = (changes.length - 1); i >= 0; i--) {
        EtherPlan.Helper.set_part_value(changes[i].id,"order",changes[i].newOrder);
    }

    var objEntry = {
        parent: objParent._id,
        order: order,
        level: level,
        isGroup: false,
        label: label.value,
        value: parseInt(value.value),
        doc: Session.get('doc'),
        timestampCreated: (new Date()).getTime(),
        start: start.value,
        finish: finish.value,
    };

    if (predecessors.value != "") {
        objEntry['predecessors'] = predecessors.value;
    }

    var newPart = EtherPlan.Parts.insert(objEntry);

    if (Session.equals('adding_part', parent.value) && !objParent.isGroup) {
        EtherPlan.Helper.set_part_value(parent.value,"isGroup",true);
    }

    EtherPlan.Helper.update_values();

    if (evt) {
        evt.target.value = '';
    }
    return newPart;
}

EtherPlan.Action.entrySendPlus = function (text, evt) {
    var newPart = EtherPlan.Action.entry(text, evt);
    Session.set('adding_part', null);
    Session.set('adding_brother_part', newPart);
}

EtherPlan.Action.entrySendPlusPlus = function (text, evt) {
    var newPart = EtherPlan.Action.entry(text, evt);
    Session.set('adding_brother_part', null);
    Session.set('adding_part', newPart);
}

EtherPlan.Action.entrySend = function (text, evt) {
    EtherPlan.Action.entry(text, evt);
    EtherPlan.Action.entryCancel();
}

EtherPlan.Action.entryCancel = function () {
    Session.set('adding_part', null);
    Session.set('adding_brother_part', null);
}

Template.entry.events = {
    'click #iconActionCheckEntry': EtherPlan.Action.entrySend,
    'click #entrySendPlus': EtherPlan.Action.entrySendPlus,
    'click #entrySendPlusPlus': EtherPlan.Action.entrySendPlusPlus,
    'click #iconActionXEntry': EtherPlan.Action.entryCancel
};

Template.entry.events[EtherPlan.Helper.okcancel_events('')] = EtherPlan.Helper.make_okcancel_handler({
    ok: EtherPlan.Action.entrySend,
    cancel: EtherPlan.Action.entryCancel
});

Template.entry.sizeTable = function () {
    return EtherPlan.Parts.find({doc: Session.get('doc')}).count();
};

Template.entry.start = function() {
    return this.finish;
}

Template.entry.finish = function() {
    return Date.parseFormat(this.finish,"YYYY-MM-DD").add(1,'businessdays').dateFormat("YYYY-MM-DD");
}

Template.entry.predecessors = function() {
    return this._id;
}