import {DataModel} from "../table/DataModel.js";
import BaseChart from "./BaseChart.js"
import ImageTable from "../table/ImageTable.js";



class ImageTableChart extends BaseChart{
    constructor(dataStore,div,config){
		super(dataStore,div,config);
       
        this.dataModel= new DataModel(dataStore,{
            autoupdate:false
        });
        this.dataModel.setColumns(this.config.param);
        this.dataModel.updateModel();
        const c = this.config;
        c.margins = c.margins || {top_bottom:10,left_right:10}

     

        this.grid= new ImageTable(this.contentDiv,this.dataModel,{
            base_url:c.images.base_url,
            image_type:c.images.type,
            image_key:c.param[0],
            initial_image_width:c.image_width,
            image_label:c.image_label,
            margins:c.margins
        });
        this.grid.addListener("image_clicked",(e,index)=>{
            this.dataStore.dataHighlighted([index],this)
        },c.id);

        if (c.sortBy) this.sortBy(c.sortBy, c.sortOrder);
	}

    setSize(x,y){
        super.setSize(x,y);
        this.grid.resize();
    }

    onDataFiltered(){
        this.dataModel.updateModel();
        this.grid.show();       
    }

    getColorOptions(){
        return {
            colorby:"all",
            color_overlay: 0,
        }
    }

    onDataHighlighted(data){
        if (data.source===this){
            return;
        }
        const id = data.indexes[0];
        this.grid.scrollToTile(id,true);

    }

    setImageLabel(column){
        this.config.image_label=column;
        this.grid.setImageLabel(column);

    }

    colorByColumn(column){
		this.grid.setColorBy(this.getColorFunction(column,false), this.config.color_overlay);
        const ft = this.grid.getFirstTileInView();
        this.grid.show(ft);
	}

    colorByDefault(){
        this.grid.setColorBy(null);
        const ft = this.grid.getFirstTileInView();
        this.grid.show(ft);
    }
    sortBy(columnName, ascending = true) {
        this.config.sortBy = columnName;
        this.config.sortOrder = ascending;
        this.dataModel.sort(columnName, ascending ? "asc" : "desc");
        const ft = this.grid.getFirstTileInView();
        this.grid.show(ft);
    }
    setPixelated(pixelated){
        this.config.pixelated=pixelated;
        this.grid.setPixelated(pixelated);
    }
    setImageTitle(column){
        this.config.image_title = column;
        this.grid.setImageTitle(column);
    }

    getSettings(){
        const od = this.grid.originalDimensions;
        const c = this.config;
        const settings = super.getSettings();
        const cols= this.dataStore.getColumnList("all",true);
        return settings.concat([
        {
            type:"slider",
            max: Math.max(128, od[1]*4),
            min:10,
            doc:this.__doc__,
            label:"Image Size",
            current_value:c.image_width || od[0],
            func:x=>{
                c.image_width=x;
                this.grid.setImageWidth(x,true)
            }
        },
        {
            label: "Pixelated?",
            type: "check",
            current_value: c.pixelated || false,
            func: x => {
                this.setPixelated(x);
            }
        },
        {
            label:"Label",
            type:"dropdown",
            values:[cols,"name","field"],
            current_value:c.image_label || "__none__",
            func:x=>{
                this.setImageLabel(x ==="__none__"?null:x)
            }
        },
        {
            label:"Tooltip",
            type:"dropdown",
            values:[cols,"name","field"],
            current_value:c.image_title || "__none__",
            func:x=>{
                this.setImageTitle(x ==="__none__"?undefined:x)
            }
        },
        {
            label: "Sort By",
            type: "dropdown",
            values: [cols, "name", "field"],
            current_value: c.sortBy || "__none__",
            func: x => {
                this.sortBy(x === "__none__" ? null : x)
            }
        },
        {
            label: "Sort Ascending?",
            type: "check",
            current_value: c.sortOrder || true,
            func: x => {
                this.sortBy(c.sortBy, x)
            }
        },
        ])
    }
    changeBaseDocument(doc){
        super.changeBaseDocument(doc);
        this.grid.__doc__=doc;
      }
}



BaseChart.types["image_table_chart"]={
    "class":ImageTableChart,
    name:"Image Table",
    required:["images"],
    methodsUsingColumns:["setImageLabel", "sortBy", "setTitleColumn", "setImageTitle"],
    configEntriesUsingColumns:["image_label", "sort_by", "image_title"],

    init:(config,dataSource,extraControls)=>{
        //get the available images
        const i = dataSource.images[extraControls.image_set];
        config.param= [i.key_column];
        //set the base url and type
        config.images={
            base_url:i.base_url,
            type:i.type
        }
        config.sortBy = extraControls.sort_by;
        config.sortOrder = extraControls.sort_order;
    },
    extra_controls:(dataSource)=>{
        const imageSets=[];
        for (let iname in dataSource.images){
            imageSets.push({name:iname,value:iname})
        }
        const sortableColumns = dataSource.getLoadedColumns().map(c=>({name:c,value:c}));
        return [
            //drop down of available image sets
            {
                type:"dropdown",
                name:"image_set",
                label:"Image Set",
                values:imageSets
            },
            {
                type: "dropdown",
                name: "image_title",
                label: "Tooltip",
                values: sortableColumns
            },
            //drop down of columns to sort by
            {
                type: "dropdown",
                name: "sort_by",
                label: "Sort By",
                values: sortableColumns
            },
            //sort order checkbox... broken
            // {
            //     type:"checkbox",
            //     name:"sort_order",
            //     label:"Sort Ascending",
            //     value:true
            // },
        ];
    }
}

export default ImageTableChart;