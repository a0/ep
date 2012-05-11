$(function () {

    // from: https://github.com/juanpujol/meteor-scrum/blob/master/public/app.js
    $(document).bind("DOMSubtreeModified", function () {
        console.log("ya")
        initSortable();
    })


    var initSortable = function () {
            $("tbody.sortable").sortable({
                items: "tr:not(:first)",
                //helper: 'clone',
                helper: fixHelper,
                update:function(e, ui){
                    var oldOrder = parseInt(ui.item.find(".order").text());
                    var newOrder = parseInt(ui.item.prev().find(".order").text());
                    if (oldOrder>newOrder) {
                        newOrder++;
                    }
                    if (EtherPlan.Helper.validate_move_part(oldOrder,newOrder)) {
                            EtherPlan.Helper.move_part(oldOrder,newOrder);
                    } else {
                        var element = $(ui.item[0]);
                        var lastPrev = element.data('lastPrev');
                        // TODO: review rollback
                        $(element).insertAfter($(lastPrev));
                    }
                },
                start: function(event, ui) {
                    $('tbody.sortable').find('tr:hidden').show();
                    var element = $(ui.item[0]);
                    element.data('lastPrev', element.prev());
                },
                opacity: '.5',
                handle: '.showOrder'
            }).disableSelection();
        }

    // from: http://www.foliotek.com/devblog/make-table-rows-sortable-using-jquery-ui-sortable/
    var fixHelper = function (e, ui) {
            ui.children().each(function () {
                $(this).width($(this).width());
            });
            return ui;
        };

})