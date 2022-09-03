import HierarchyWidget from '@girder/core/views/widgets/HierarchyWidget';
import { wrap } from '@girder/core/utilities/PluginUtils';
import {renderHistoQC} from './js/histoqc_view'


wrap(HierarchyWidget, 'render', function (render) {
    render.call(this);
    console.log(this)
    const widget =  this.$('.g-hierarchy-widget')
    renderHistoQC(render, widget);
});
