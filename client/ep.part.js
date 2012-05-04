Template.part.editing = function () {
    return Session.equals('editing_part', this._id);
};

Template.part.adding = function () {
    return Session.equals('adding_part', this._id) || Session.equals('adding_brother_part', this._id);
};

EtherPlan.Action.clickLabel = function (evt) {
    Session.set('adding_brother_part', null);
    Session.set('adding_part', null);
    Session.set('editing_part', this._id);
    Meteor.flush();
    EtherPlan.Helper.focus_field_by_id("editLabel");
};

EtherPlan.Action.clickStart= function (evt) {
    if (!this.isGroup) {
        Session.set('adding_brother_part', null);
        Session.set('adding_part', null);
        Session.set('editing_part', this._id);
        Meteor.flush();
        EtherPlan.Helper.focus_field_by_id("editStart");
    }
};

EtherPlan.Action.clickValue = function (evt) {
    if (!this.isGroup) {
        Session.set('adding_brother_part', null);
        Session.set('adding_part', null);
        Session.set('editing_part', this._id);
        Meteor.flush();
        EtherPlan.Helper.focus_field_by_id("editValue");
    }
};

Template.part.events = {
    'click .showLabel': EtherPlan.Action.clickLabel,
    'click .showOrder': EtherPlan.Action.clickLabel,
    'click .showStart': EtherPlan.Action.clickStart,
    'click .showValue': EtherPlan.Action.clickValue
};

