export const sampleGraphs = {

    // credit goes to `http://www.continuitycentral.com/`
    emergencyProcedure: `{
        "paperColor": "#fafbfb",
        "snaplines": true,
        "infinitePaper": true,
        "dotGrid": true,
        "gridSize": 10,
        "cells": [
            {
                "type": "standard.Polygon",
                "position": {
                    "x": 435,
                    "y": 225.50000000000003
                },
                "size": {
                    "width": 160,
                    "height": 98.99999999999994
                },
                "angle": 0,
                "id": "bbbd5104-4965-4b86-bcb1-1552bfbb04d6",
                "z": 88,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#353535",
                        "fill": "#FFFFFF",
                        "refPoints": "50,0 100,50 50,100 0,50",
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 15,
                        "fill": "#353535",
                        "text": "Auto alarm\\nactivated?",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Ellipse",
                "position": {
                    "x": 475,
                    "y": 82
                },
                "size": {
                    "width": 80,
                    "height": 80
                },
                "angle": 0,
                "id": "6374dec5-83d1-4e31-832a-ac24755672a2",
                "z": 89,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#353535",
                        "fill": "#FFFFFF",
                        "strokeDasharray": "10,5"
                    },
                    "label": {
                        "fontSize": 16,
                        "fill": "#353535",
                        "text": "Fire\\nIncident",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Bold",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "6374dec5-83d1-4e31-832a-ac24755672a2"
                },
                "target": {
                    "id": "bbbd5104-4965-4b86-bcb1-1552bfbb04d6"
                },
                "id": "56dc6e7b-916d-42fa-8d5b-0942474383e5",
                "z": 90,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Ellipse",
                "position": {
                    "x": 375,
                    "y": 260
                },
                "size": {
                    "width": 30,
                    "height": 30
                },
                "angle": 0,
                "id": "064747aa-f153-43bd-af2d-76e5b9a63a8c",
                "z": 91,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#3771B8",
                        "fill": "#FFFFFF",
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 11,
                        "fill": "#3771B8",
                        "text": "No",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "bbbd5104-4965-4b86-bcb1-1552bfbb04d6"
                },
                "target": {
                    "id": "064747aa-f153-43bd-af2d-76e5b9a63a8c"
                },
                "id": "4c3c6d56-4c5e-4def-93f7-953972f65086",
                "z": 92,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Ellipse",
                "position": {
                    "x": 500,
                    "y": 351
                },
                "size": {
                    "width": 30,
                    "height": 30
                },
                "angle": 0,
                "id": "3fd6a2d5-959c-4124-aa18-cc9cdc33cd3a",
                "z": 94,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#3771B8",
                        "fill": "#FFFFFF",
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 11,
                        "fill": "#3771B8",
                        "text": "Yes",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "bbbd5104-4965-4b86-bcb1-1552bfbb04d6"
                },
                "target": {
                    "id": "3fd6a2d5-959c-4124-aa18-cc9cdc33cd3a"
                },
                "id": "627c93be-f5f9-4a06-bf62-cfdc8eec3df2",
                "z": 95,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 660,
                    "y": 248
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "0619ff3d-7bb1-4d5f-94e3-2b359b545077",
                "z": 96,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#F5242C",
                        "fill": "#FFFFFF",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "10,5"
                    },
                    "label": {
                        "fontSize": 15,
                        "fill": "#F5242C",
                        "text": "Activate\\nevacuation",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "bbbd5104-4965-4b86-bcb1-1552bfbb04d6"
                },
                "target": {
                    "id": "0619ff3d-7bb1-4d5f-94e3-2b359b545077"
                },
                "id": "bcaae721-b040-4916-815d-6abe67f9119f",
                "z": 98,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 250,
                    "y": 339
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "cb9a597f-ea84-4b2f-bd50-0581c27ec557",
                "z": 99,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 12,
                        "fill": "#3771B8",
                        "text": "Employees\\ninforms\\nprimary\\ncontact",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "064747aa-f153-43bd-af2d-76e5b9a63a8c"
                },
                "target": {
                    "id": "afc095b8-452b-4833-bb8f-ead56dfbf64e"
                },
                "id": "249acf5d-3c8a-4ec1-b730-410d637f9dbd",
                "z": 100,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 100,
                    "y": 248
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "8cdadca1-587b-47f1-a9af-1ea813e098ea",
                "z": 101,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#F5242C",
                        "fill": "#FFFFFF",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "10,5"
                    },
                    "label": {
                        "fontSize": 15,
                        "fill": "#F5242C",
                        "text": "Activate\\nevacuation",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "afc095b8-452b-4833-bb8f-ead56dfbf64e"
                },
                "target": {
                    "id": "8cdadca1-587b-47f1-a9af-1ea813e098ea"
                },
                "id": "93eb8c3b-2256-468f-8516-032b413c7e81",
                "z": 102,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 250,
                    "y": 248
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "afc095b8-452b-4833-bb8f-ead56dfbf64e",
                "z": 103,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 12,
                        "fill": "#3771B8",
                        "text": "Employees\\nmanually\\nactivates alarm",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "afc095b8-452b-4833-bb8f-ead56dfbf64e"
                },
                "target": {
                    "id": "cb9a597f-ea84-4b2f-bd50-0581c27ec557"
                },
                "id": "46200e2d-4bd2-46db-844f-772ef273cbe5",
                "z": 104,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Polygon",
                "position": {
                    "x": 435,
                    "y": 411
                },
                "size": {
                    "width": 160,
                    "height": 98.99999999999994
                },
                "angle": 0,
                "id": "1eaf6c3a-520f-41c7-9ac7-7008c5cc3e44",
                "z": 106,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#353535",
                        "fill": "#FFFFFF",
                        "refPoints": "50,0 100,50 50,100 0,50",
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 10,
                        "fill": "#353535",
                        "text": "Alarm monitoring\\nservice provider\\ncontacts organization?",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "cb9a597f-ea84-4b2f-bd50-0581c27ec557"
                },
                "target": {
                    "id": "1eaf6c3a-520f-41c7-9ac7-7008c5cc3e44"
                },
                "id": "b5f09409-0526-4252-9289-739a24fd7839",
                "z": 107,
                "vertices": [
                    {
                        "x": 295,
                        "y": 460.5
                    }
                ],
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "3fd6a2d5-959c-4124-aa18-cc9cdc33cd3a"
                },
                "target": {
                    "id": "1eaf6c3a-520f-41c7-9ac7-7008c5cc3e44"
                },
                "id": "70d38b87-d427-4da8-82ed-c98fb6f290dd",
                "z": 108,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Ellipse",
                "position": {
                    "x": 500,
                    "y": 542
                },
                "size": {
                    "width": 30,
                    "height": 30
                },
                "angle": 0,
                "id": "d61f5f92-b2c1-46fb-8677-40426f2db2a8",
                "z": 109,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#3771B8",
                        "fill": "#FFFFFF",
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 11,
                        "fill": "#3771B8",
                        "text": "Yes",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Ellipse",
                "position": {
                    "x": 625,
                    "y": 495
                },
                "size": {
                    "width": 30,
                    "height": 30
                },
                "angle": 0,
                "id": "8167630c-8740-4bdc-bae2-2b85127eec04",
                "z": 110,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#3771B8",
                        "fill": "#FFFFFF",
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 11,
                        "fill": "#3771B8",
                        "text": "No",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "1eaf6c3a-520f-41c7-9ac7-7008c5cc3e44"
                },
                "target": {
                    "id": "d61f5f92-b2c1-46fb-8677-40426f2db2a8"
                },
                "id": "a34c60c4-af41-4a47-a45d-3c02e9b7cf2a",
                "z": 111,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "1eaf6c3a-520f-41c7-9ac7-7008c5cc3e44"
                },
                "target": {
                    "id": "8167630c-8740-4bdc-bae2-2b85127eec04"
                },
                "id": "10230441-e15f-4202-b37c-6aed52911f23",
                "z": 112,
                "vertices": [
                    {
                        "x": 640,
                        "y": 460.5
                    }
                ],
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 468,
                    "y": 607
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "d08f5ece-f171-4bbe-a7ee-ffd4b262ad92",
                "z": 115,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#353535",
                        "fill": "#FFFFFF",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 12,
                        "fill": "#353535",
                        "text": "Primary\\ncontact\\nconfirms fire\\nincident",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 468,
                    "y": 691
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "2c44a2f3-ab10-49c7-9ff2-74b74ef55253",
                "z": 116,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#353535",
                        "fill": "#FFFFFF",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 12,
                        "fill": "#353535",
                        "text": "Service\\nProvider\\ncontacts Fire\\nDepartment",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 468,
                    "y": 775
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "3d91727c-6b73-4ee7-b74a-dbba705654a8",
                "z": 117,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 12,
                        "fill": "#3771B8",
                        "text": "Fire Engines\\narrives",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 468,
                    "y": 859
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "1a9926a7-7dc6-47ba-bfce-6c1c77b709f6",
                "z": 118,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 10,
                        "fill": "#3771B8",
                        "text": "Crisis\\nManagement\\nTeam Leader\\nbriefs\\nBattalion Chief",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 243,
                    "y": 802
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "0a0a1a4d-b66c-4e8e-a1cc-5fe9fd62a7e3",
                "z": 119,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 12,
                        "fill": "#3771B8",
                        "text": "Crisis\\nManagement\\nTeam directs\\nfuture actions",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 243,
                    "y": 718
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "803a2245-1f1c-48e0-93c5-ea9326d5012c",
                "z": 120,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 11,
                        "fill": "#3771B8",
                        "text": "Fire Department\\ngives All-Clear\\nsignal",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 243,
                    "y": 635
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "ad56b0f5-490d-4991-adc7-4141c210e368",
                "z": 121,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 10,
                        "fill": "#3771B8",
                        "text": "Fire Department\\nbecomes Incident\\nCommander",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 595,
                    "y": 563
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "d4981a4a-d934-4ce5-9db4-13fe98e28a86",
                "z": 122,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 12,
                        "fill": "#3771B8",
                        "text": "Primary\\ncontact\\ncontacts Fire\\nDepartment",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 595,
                    "y": 647
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "81010a6e-d5de-4b96-b665-f45bc2aa7ba9",
                "z": 123,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 11,
                        "fill": "#3771B8",
                        "text": "Primary contact\\ninforms\\nEmergency\\nResponse Team",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 595,
                    "y": 731
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "878b7e3d-5079-4277-992c-4c0a7c39d3e8",
                "z": 124,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#E4ECF7",
                        "fill": "#E4ECF7",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 9,
                        "fill": "#3771B8",
                        "text": "Emergency\\nResponse\\nTeam informs\\nCrisis\\nManagement Team",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 786,
                    "y": 381
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "c850d5e9-95e2-4d90-a4ed-934a693a98cf",
                "z": 125,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#353535",
                        "fill": "#FFFFFF",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 10,
                        "fill": "#353535",
                        "text": "Evacuees report\\nto Gathering\\nPoint / Safe Area",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 786,
                    "y": 465
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "832f2c60-da26-4fff-8db4-5ea087bbeef7",
                "z": 126,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#353535",
                        "fill": "#FFFFFF",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 10,
                        "fill": "#353535",
                        "text": "Roll call taken by\\nteam leads",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 786,
                    "y": 549
                },
                "size": {
                    "width": 90,
                    "height": 54
                },
                "angle": 0,
                "id": "df93397c-c309-4ebe-9a33-51d51ea5b4fd",
                "z": 127,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "#353535",
                        "fill": "#FFFFFF",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 9,
                        "fill": "#353535",
                        "text": "Floor Marshals\\nbrief Crisis\\nManagement\\nTeam using floor\\nplans",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "0619ff3d-7bb1-4d5f-94e3-2b359b545077"
                },
                "target": {
                    "id": "c850d5e9-95e2-4d90-a4ed-934a693a98cf"
                },
                "id": "ee81ac0d-f8de-420b-8ac0-8b9df5ee279b",
                "z": 128,
                "vertices": [
                    {
                        "x": 831,
                        "y": 275
                    }
                ],
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "c850d5e9-95e2-4d90-a4ed-934a693a98cf"
                },
                "target": {
                    "id": "832f2c60-da26-4fff-8db4-5ea087bbeef7"
                },
                "id": "3e742db6-c6f5-412f-b9ff-0b93a371145f",
                "z": 129,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "832f2c60-da26-4fff-8db4-5ea087bbeef7"
                },
                "target": {
                    "id": "df93397c-c309-4ebe-9a33-51d51ea5b4fd"
                },
                "id": "5ffee384-4c12-4664-bd9b-0b6e62eb4498",
                "z": 130,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "df93397c-c309-4ebe-9a33-51d51ea5b4fd"
                },
                "target": {
                    "id": "1a9926a7-7dc6-47ba-bfce-6c1c77b709f6"
                },
                "id": "c21b9ac0-f7c8-436e-a1a9-61611b7993cb",
                "z": 131,
                "vertices": [
                    {
                        "x": 831,
                        "y": 886
                    }
                ],
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "normal"
                },
                "labels": [],
                "source": {
                    "id": "d4981a4a-d934-4ce5-9db4-13fe98e28a86"
                },
                "target": {
                    "id": "81010a6e-d5de-4b96-b665-f45bc2aa7ba9"
                },
                "id": "fc83084d-8d59-43a4-8478-787b0a889a82",
                "z": 132,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "normal"
                },
                "labels": [],
                "source": {
                    "id": "81010a6e-d5de-4b96-b665-f45bc2aa7ba9"
                },
                "target": {
                    "id": "878b7e3d-5079-4277-992c-4c0a7c39d3e8"
                },
                "id": "0a11f6cb-95fd-4ef6-8d8c-fc7edf69f7d5",
                "z": 133,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "8167630c-8740-4bdc-bae2-2b85127eec04"
                },
                "target": {
                    "id": "d4981a4a-d934-4ce5-9db4-13fe98e28a86"
                },
                "id": "63362a6d-8f77-47a7-a6a3-67c1769348b4",
                "z": 134,
                "vertices": [],
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "1a9926a7-7dc6-47ba-bfce-6c1c77b709f6"
                },
                "target": {
                    "id": "ad56b0f5-490d-4991-adc7-4141c210e368"
                },
                "id": "f8eb10ae-a4a3-4f82-aaeb-72eef7c87108",
                "z": 135,
                "vertices": [
                    {
                        "x": 401,
                        "y": 886
                    },
                    {
                        "x": 401,
                        "y": 605
                    },
                    {
                        "x": 288,
                        "y": 605
                    }
                ],
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "ad56b0f5-490d-4991-adc7-4141c210e368"
                },
                "target": {
                    "id": "803a2245-1f1c-48e0-93c5-ea9326d5012c"
                },
                "id": "a901a6e9-3c1d-4029-ac52-0aa962b5904a",
                "z": 136,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "803a2245-1f1c-48e0-93c5-ea9326d5012c"
                },
                "target": {
                    "id": "0a0a1a4d-b66c-4e8e-a1cc-5fe9fd62a7e3"
                },
                "id": "080e362f-019c-4c3c-a0f6-599689eb218d",
                "z": 137,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "d61f5f92-b2c1-46fb-8677-40426f2db2a8"
                },
                "target": {
                    "id": "d08f5ece-f171-4bbe-a7ee-ffd4b262ad92"
                },
                "id": "c57b02c8-1e1c-4c64-8641-052814b248bf",
                "z": 138,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "d08f5ece-f171-4bbe-a7ee-ffd4b262ad92"
                },
                "target": {
                    "id": "2c44a2f3-ab10-49c7-9ff2-74b74ef55253"
                },
                "id": "71b59998-e319-4a93-b830-87f57850f8db",
                "z": 139,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "2c44a2f3-ab10-49c7-9ff2-74b74ef55253"
                },
                "target": {
                    "id": "3d91727c-6b73-4ee7-b74a-dbba705654a8"
                },
                "id": "4153a528-afd7-4ced-80f3-d0d6205dcd18",
                "z": 140,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "app.Link",
                "router": {
                    "name": "normal"
                },
                "connector": {
                    "name": "rounded"
                },
                "labels": [],
                "source": {
                    "id": "3d91727c-6b73-4ee7-b74a-dbba705654a8"
                },
                "target": {
                    "id": "1a9926a7-7dc6-47ba-bfce-6c1c77b709f6"
                },
                "id": "88e395df-0004-4e67-9d50-dca0bce3ac77",
                "z": 141,
                "attrs": {
                    "line": {
                        "stroke":"#3771B8",
                        "targetMarker": {
                            "d":"M 0 0 0 0"
                        }
                    }
                }
            },
            {
                "type": "standard.Rectangle",
                "position": {
                    "x": 100,
                    "y": 110
                },
                "size": {
                    "width": 230,
                    "height": 50
                },
                "angle": 0,
                "id": "f7d17de6-0af5-4b03-836b-0d465e9a2285",
                "z": 142,
                "attrs": {
                    "root": {
                        "dataTooltipPosition": "left",
                        "dataTooltipPositionSelector": ".joint-stencil"
                    },
                    "body": {
                        "stroke": "transparent",
                        "fill": "transparent",
                        "rx": 2,
                        "ry": 2,
                        "strokeDasharray": "0"
                    },
                    "label": {
                        "fontSize": 24,
                        "fill": "#353535",
                        "text": "Emergency Procedure",
                        "fontFamily": "Open Sans",
                        "fontWeight": "Normal",
                        "strokeWidth": 0
                    }
                }
            }
        ]
    }`
};
