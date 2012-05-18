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
    Session.set('field_edit','editLabel');
};

EtherPlan.Action.clickStart= function (evt) {
    if (!this.isGroup) {
        Session.set('adding_brother_part', null);
        Session.set('adding_part', null);
        Session.set('editing_part', this._id);
        Session.set('field_edit','editStart');
    }
};

EtherPlan.Action.clickFinish= function (evt) {
    if (!this.isGroup) {
        Session.set('adding_brother_part', null);
        Session.set('adding_part', null);
        Session.set('editing_part', this._id);
        Session.set('field_edit','editFinish');
    }
};

EtherPlan.Action.clickValue = function (evt) {
    if (!this.isGroup) {
        Session.set('adding_brother_part', null);
        Session.set('adding_part', null);
        Session.set('editing_part', this._id);
        Session.set('field_edit','editValue');
    }
};

EtherPlan.Action.clickDepend = function (evt) {
    Session.set('adding_brother_part', null);
    Session.set('adding_part', null);
    Session.set('editing_part', this._id);
    Session.set('field_edit','editDepend');
};

Template.part.events = {
    'click .showLabel': EtherPlan.Action.clickLabel,
    'click .showDepend': EtherPlan.Action.clickDepend,
    'click .showStart': EtherPlan.Action.clickStart,
    'click .showFinish': EtherPlan.Action.clickFinish,
    'click .showValue': EtherPlan.Action.clickValue
};

