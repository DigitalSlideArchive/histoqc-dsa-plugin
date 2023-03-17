import HierarchyWidget from '@girder/core/views/widgets/HierarchyWidget';
import { wrap } from '@girder/core/utilities/PluginUtils';
import {renderHistoQC} from './js/histoqc_view'


wrap(HierarchyWidget, 'render', function (render) {
    render.call(this);
    console.log(this)
    const is_folder = this.parentModel.attributes._modelType == "folder"
    if (!is_folder) return
    const folder_id = this.parentModel.id
    console.log('folder_id = ', folder_id)
    const widget =  this.$('.g-hierarchy-widget')
    renderHistoQC(widget, folder_id)
});
