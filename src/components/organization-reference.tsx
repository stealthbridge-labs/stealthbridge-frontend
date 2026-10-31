/** Customer-controlled reference disclosure; never the organization's title. */
export function OrganizationReference({id}:{id:string}){
 return <details className="organization-reference">
  <summary>Organization reference</summary>
  <p>Use this reference when asking about this workspace.</p>
  <code>{id}</code>
 </details>;
}
