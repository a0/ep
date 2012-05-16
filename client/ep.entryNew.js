EtherPlan.Action.entryNewSend = function (text, evt) {
    var label = document.getElementById('entryLabel');
    var value = document.getElementById('entryValue');
    var start = document.getElementById('entryStart');
    var finish = document.getElementById('entryFinish');
    var level = 0;
    var order = 0;

    var id = EtherPlan.Parts.insert({
        order: order,
        level: level,
        isGroup: false,
        label: label.value,
        value: parseInt(value.value),
        doc: Session.get('doc'),
        timestampCreated: (new Date()).getTime(),
        start: start.value,
        finish: finish.value
    });
    if (evt) {
        evt.target.value = '';
    }
}

Template.entryNew.events = {
    'click #iconActionCheck': EtherPlan.Action.entryNewSend
};

Template.entryNew.events[EtherPlan.Helper.okcancel_events('#entryLabel')] = EtherPlan.Helper.make_okcancel_handler({
    ok: EtherPlan.Action.entryNewSend
});

Template.entryNew.start = function() {
    return (new Date()).dateFormat("YYYY-MM-DD");
}

Template.entryNew.finish = function() {
    return (new Date()).dateFormat("YYYY-MM-DD");
}