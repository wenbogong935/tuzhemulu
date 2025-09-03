define(['jquery', 'bootstrap', 'backend', 'table', 'form', 'template'], function ($, undefined, Backend, Table, Form, Template) {

    var Controller = {
        index: function () {
            // Initialize the table
            Table.api.init({
                extend: {
                    index_url: 'productcatalog/slides/index' + location.search,
                    add_url: 'productcatalog/slides/add',
                    edit_url: 'productcatalog/slides/edit',
                    del_url: 'productcatalog/slides/del',
                    multi_url: 'productcatalog/slides/multi',
                    sort_url: 'productcatalog/slides/weigh', // URL for drag-and-drop sorting if 'weigh' field is used for ordering
                    table: 'productcatalog_slides',
                }
            });

            var table = $("#table");

            // Initialize table
            table.bootstrapTable({
                url: $.fn.bootstrapTable.defaults.extend.index_url,
                pk: 'id',
                sortName: 'slide_order', // Default sort by 'slide_order'
                sortOrder: 'asc',
                columns: [
                    [
                        {checkbox: true},
                        {field: 'id', title: __('Id'), sortable: true},
                        {field: 'type_text', title: __('Type'), operate: 'LIKE'},
                        {field: 'title', title: __('Title'), operate: 'LIKE'},
                        {field: 'subtitle', title: __('Subtitle'), operate: 'LIKE', visible: false},
                        {field: 'background_image', title: __('Background_image'), operate: false, formatter: Table.api.formatter.image, visible: false},
                        {field: 'background_color', title: __('Background_color'), operate: 'LIKE', visible: false},
                        {field: 'slide_order', title: __('Slide_order'), sortable: true},
                        {field: 'status_text', title: __('Status'), formatter: Table.api.formatter.status, searchList: {'active':__('Active'),'inactive':__('Inactive')}},
                        {field: 'createtime', title: __('Createtime'), operate:'RANGE', addclass:'datetimerange', formatter: Table.api.formatter.datetime, sortable: true},
                        {field: 'updatetime', title: __('Updatetime'), operate:'RANGE', addclass:'datetimerange', formatter: Table.api.formatter.datetime, sortable: true, visible: false},
                        {field: 'operate', title: __('Operate'), table: table, events: Table.api.events.operate, formatter: Table.api.formatter.operate}
                    ]
                ]
            });

            // Bind events for table
            Table.api.bindevent(table);
            
            // Setup drag-sort
            require(['dragsort'], function () {
                table.on('load-success.bs.table', function () { // Bind after table loaded
                    table.dragsort({
                        itemSelector: 'tbody tr',
                        dragSelector: 'a[data-dragsort="true"]', // Define a handle if needed, or use whole row
                        dragEnd: function () {
                            var data = table.bootstrapTable('getData');
                            var ids = $.map(data, function (item) { return item.id; });
                            var orders = $.map(data, function(item) { return item.slide_order; });
                            // Here you would send an AJAX request to your `sort_url` to update order.
                            // FastAdmin's `weigh` field and controller action usually handles this if that field name is used.
                            // For 'slide_order', a custom handler or a modified 'weigh' action might be needed.
                            // For simplicity, we assume 'sort_url' (weigh action) can handle 'slide_order' or is adapted.
                            Fastask.api.ajax({
                                url: $.fn.bootstrapTable.defaults.extend.sort_url,
                                data: {ids: ids.join(','), weigh: orders.join(',')} // Adjust if 'weigh' is not the field name expected by sort_url
                            }, function(data, ret){
                                table.bootstrapTable('refresh');
                            });
                        },
                        placeHolderTemplate: "" // Optional: Custom placeholder style
                    });
                });
            });

        },
        add: function () {
            Controller.bindFormEvents();
            // Trigger change on page load to set initial visibility
            $('#c-type').trigger('change');
        },
        edit: function () {
            Controller.bindFormEvents();
            // Trigger change on page load to set initial visibility
            $('#c-type').trigger('change');
        },
        bindFormEvents: function() {
            Form.api.bindevent($("form[role=form]"));

            // Dynamic form fields based on slide type
            $('#c-type').on('change', function () {
                var type = $(this).val();
                $('.slide-details-group').hide(); // Hide all specific detail groups
                $('.slide-details.generic-details').show(); // Show generic content by default

                var genericItemsTitle = __('Items'); // Default title

                if (type === 'product') {
                    $('#product-details-container').show();
                } else if (type === 'about_us') {
                    $('#about_us-details-container').show();
                } else if (type === 'design_philosophy') {
                    $('#generic_items-details-container').show();
                    genericItemsTitle = __('Design Philosophy Items');
                } else if (type === 'services') {
                    $('#generic_items-details-container').show();
                    genericItemsTitle = __('Service/Feature Items');
                } else if (type === 'customization_process') {
                    $('#generic_items-details-container').show();
                    genericItemsTitle = __('Customization Process Steps');
                } else if (type === 'contact') {
                    $('#contact_info-details-container').show();
                } else if (type === 'title_slide') {
                    // For title slide, often only title, subtitle, and background are needed.
                    // Generic content can be used for additional text.
                } else if (type === 'generic') {
                    // Generic content field is already visible.
                }
                $('#generic_items_title').text(genericItemsTitle);
            });

            // Repeater for Generic Items
            var genericItemIndex = $('#generic-items-list .generic-item-instance').length;
            $('#add-generic-item').on('click', function () {
                var itemHtml = Template('generic-item-template', {index: genericItemIndex});
                $('#generic-items-list').append(itemHtml);
                // Re-initialize plupload/fachoose for new elements if Form.api.bindevent doesn't cover it post-append
                // Usually, FastAdmin's Form.events.plupload and Form.events.fachoose handle this.
                // If not, manually trigger:
                // Form.events.plupload($('#generic-items-list').find("#plupload-generic-item-image_url-" + genericItemIndex).closest(".input-group"));
                // Form.events.fachoose($('#generic-items-list').find("#fachoose-generic-item-image_url-" + genericItemIndex).closest(".input-group"));
                // Or rebind the whole form:
                Form.api.bindevent($('#generic-items-list .generic-item-instance').last()); // Bind events to the new item
                genericItemIndex++;
            });

            $(document).on('click', '.remove-generic-item', function () {
                $(this).closest('.generic-item-instance').remove();
                // Re-index remaining items if order is strictly based on DOM position and input names need it
                // However, the current model setup for generic items deletes all and re-inserts,
                // so strict re-indexing of names on frontend might not be critical if backend handles order by appearance.
                // For robustness, one might re-calculate `item_order` fields or re-generate input names here.
            });
             // Initial setup for existing items in edit mode (ensure plupload/fachoose are initialized)
            if ($('#generic-items-list .generic-item-instance').length > 0) {
                 Form.api.bindevent($('#generic-items-list'));
            }
        }
    };
    return Controller;
});
