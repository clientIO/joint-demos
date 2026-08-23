import { BpmnEditor } from './components/bpmn-editor/bpmn-editor';

// The editor is self-contained and fills its container — to embed it in an
// existing app, mount it in any element with a definite size. For example,
// in a three-column layout:
//
// export function App() {
//     return (
//         <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 200px', height: '100%' }}>
//             <aside style={{ background: '#efefef', padding: '10px', borderRight: '1px solid #ccc' }}></aside>
//             <BpmnEditor />
//             <aside style={{ background: '#efefef', padding: '10px', borderLeft: '1px solid #ccc' }}></aside>
//         </div>
//     );
// }

export function App() {
    return <BpmnEditor />;
}
