/** Fail-closed validator for sanitized cross-system knowledge envelopes. */
export const KNOWLEDGE_KINDS = ['principle','concept','requirement','proposal','decision','observation','implementation','verification','risk','domain','unknown'] as const;
export const KNOWLEDGE_STATES = ['IDEA','SPECIFIED','AUTHORIZED','EXECUTED','OBSERVED','TESTED','VERIFIED','DEPLOYED','REVENUE_EVIDENCED','PROFIT_EVIDENCED','UNKNOWN','DIVERGENT','BLOCKED','NOT_EXECUTED'] as const;
export const KNOWLEDGE_VISIBILITIES = ['public','internal','private','restricted'] as const;
type Choice<T extends readonly string[]> = T[number];

export interface KnowledgeEnvelope {
  readonly id: string;
  readonly kind: Choice<typeof KNOWLEDGE_KINDS>;
  readonly summary: string;
  readonly state: Choice<typeof KNOWLEDGE_STATES>;
  readonly source: {
    readonly system: 'notion'|'github'|'runtime'|'human'|'external';
    readonly reference: string;
    readonly revision?: string|null;
    readonly capturedAt?: string|null;
  };
  readonly capturedAt: string;
  readonly contentHash?: string;
  readonly owner?: string;
  readonly visibility: Choice<typeof KNOWLEDGE_VISIBILITIES>;
  readonly policy: {
    readonly reviewedForPublicRelease: boolean;
    readonly containsRawSourceContent: false;
    readonly sensitivity?: 'none'|'reviewed'|'restricted'|'unknown';
    readonly approvalReference?: string|null;
  };
  readonly relations: readonly {
    readonly type: 'supports'|'contradicts'|'duplicates'|'depends_on'|'implements'|'supersedes'|'derived_from'|'related_to';
    readonly targetId: string;
  }[];
  readonly supersedes?: readonly string[];
  readonly evidence: readonly {
    readonly type: 'source'|'test'|'ci'|'runtime'|'review'|'deployment'|'business_metric';
    readonly status: 'PRESENT'|'MISSING'|'UNKNOWN'|'DIVERGENT';
    readonly reference?: string|null;
    readonly observedAt?: string|null;
    readonly note?: string;
  }[];
  readonly acceptance?: readonly string[];
  readonly nextAction?: string;
  readonly tags?: readonly string[];
}
export type KnowledgeEnvelopeResult =
  | { readonly validation:'VALID'; readonly publicExportAllowed:boolean; readonly evidence:'STRUCTURE_AND_DISCLOSURE_POLICY_ONLY'; readonly envelope:KnowledgeEnvelope; readonly issues:readonly [] }
  | { readonly validation:'INVALID'; readonly publicExportAllowed:false; readonly evidence:'STRUCTURE_AND_DISCLOSURE_POLICY_ONLY'; readonly issues:readonly {readonly code:string;readonly field:string;readonly message:string}[] };

const isRecord = (v:unknown):v is Record<string,unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v:unknown,max=4000):v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const isDate = (v:unknown):v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));
const oneOf = (values:readonly string[],v:unknown) => typeof v === 'string' && values.includes(v);
const forbidden = new Set(['content','rawcontent','rawsourcecontent','sourcebody','pagebody','rawtext','fulltext']);
const allowed = new Set(['id','kind','summary','state','source','capturedAt','contentHash','owner','visibility','policy','relations','supersedes','evidence','acceptance','nextAction','tags']);

function invalid(issues:{code:string;field:string;message:string}[]):KnowledgeEnvelopeResult {
  return {validation:'INVALID',publicExportAllowed:false,evidence:'STRUCTURE_AND_DISCLOSURE_POLICY_ONLY',issues:Object.freeze(issues.map(x=>Object.freeze(x)))};
}

/** Structural/disclosure validation only. It performs no I/O and does not prove source claims. */
export function validateKnowledgeEnvelope(input:unknown):KnowledgeEnvelopeResult {
  const issues:{code:string;field:string;message:string}[] = [];
  if (!isRecord(input)) return invalid([{code:'INVALID_SHAPE',field:'$',message:'Expected a non-null object.'}]);
  try {
    const scan = (v:unknown,path:string,depth:number):void => {
      if (depth > 12) { issues.push({code:'NESTING_LIMIT',field:path,message:'Inspection depth exceeded.'}); return; }
      if (Array.isArray(v)) { v.forEach((x,i)=>scan(x,`${path}[${i}]`,depth+1)); return; }
      if (!isRecord(v)) return;
      for (const [key,child] of Object.entries(v)) {
        if (forbidden.has(key.toLowerCase().replace(/[^a-z0-9]/g,''))) issues.push({code:'RAW_CONTENT_FIELD',field:`${path}.${key}`,message:'Raw source-body fields are forbidden.'});
        scan(child,`${path}.${key}`,depth+1);
      }
    };
    scan(input,'$',0);
    for (const key of Object.keys(input)) if (!allowed.has(key)) issues.push({code:'UNSUPPORTED_FIELD',field:key,message:'Unsupported envelope field.'});

    if (!isText(input.id,200)) issues.push({code:'INVALID_ID',field:'id',message:'id is required (max 200).'});
    if (!oneOf(KNOWLEDGE_KINDS,input.kind)) issues.push({code:'INVALID_KIND',field:'kind',message:'Unsupported kind.'});
    if (!isText(input.summary)) issues.push({code:'INVALID_SUMMARY',field:'summary',message:'summary is required (max 4000).'});
    if (!oneOf(KNOWLEDGE_STATES,input.state)) issues.push({code:'INVALID_STATE',field:'state',message:'Unsupported lifecycle state.'});
    if (!isDate(input.capturedAt)) issues.push({code:'INVALID_CAPTURE_TIME',field:'capturedAt',message:'Expected a date-time.'});
    if (input.contentHash !== undefined && (typeof input.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.contentHash))) issues.push({code:'INVALID_HASH',field:'contentHash',message:'Expected lowercase SHA-256 hex.'});
    if (input.owner !== undefined && (typeof input.owner !== 'string' || input.owner.length > 200)) issues.push({code:'INVALID_OWNER',field:'owner',message:'Invalid owner.'});
    if (!oneOf(KNOWLEDGE_VISIBILITIES,input.visibility)) issues.push({code:'INVALID_VISIBILITY',field:'visibility',message:'Unsupported visibility.'});

    const source = input.source;
    if (!isRecord(source)) issues.push({code:'INVALID_SOURCE',field:'source',message:'source object required.'});
    else {
      for (const key of Object.keys(source)) if (!['system','reference','revision','capturedAt'].includes(key)) issues.push({code:'UNSUPPORTED_SOURCE_FIELD',field:`source.${key}`,message:'Unsupported source metadata.'});
      if (!oneOf(['notion','github','runtime','human','external'],source.system)) issues.push({code:'INVALID_SOURCE_SYSTEM',field:'source.system',message:'Unsupported source system.'});
      if (!isText(source.reference,500)) issues.push({code:'INVALID_SOURCE_REFERENCE',field:'source.reference',message:'Source reference required.'});
      if (source.revision !== undefined && source.revision !== null && (typeof source.revision !== 'string' || source.revision.length > 200)) issues.push({code:'INVALID_REVISION',field:'source.revision',message:'Invalid revision.'});
      if (source.capturedAt !== undefined && source.capturedAt !== null && !isDate(source.capturedAt)) issues.push({code:'INVALID_SOURCE_TIME',field:'source.capturedAt',message:'Invalid source time.'});
    }

    const policy = input.policy;
    if (!isRecord(policy)) issues.push({code:'INVALID_POLICY',field:'policy',message:'policy object required.'});
    else {
      for (const key of Object.keys(policy)) if (!['reviewedForPublicRelease','containsRawSourceContent','sensitivity','approvalReference'].includes(key)) issues.push({code:'UNSUPPORTED_POLICY_FIELD',field:`policy.${key}`,message:'Unsupported policy field.'});
      if (typeof policy.reviewedForPublicRelease !== 'boolean') issues.push({code:'INVALID_REVIEW_FLAG',field:'policy.reviewedForPublicRelease',message:'Boolean required.'});
      if (policy.containsRawSourceContent !== false) issues.push({code:'RAW_CONTENT_NOT_ALLOWED',field:'policy.containsRawSourceContent',message:'Must be false.'});
      if (policy.sensitivity !== undefined && !oneOf(['none','reviewed','restricted','unknown'],policy.sensitivity)) issues.push({code:'INVALID_SENSITIVITY',field:'policy.sensitivity',message:'Unsupported sensitivity.'});
      if (policy.approvalReference !== undefined && policy.approvalReference !== null && (typeof policy.approvalReference !== 'string' || policy.approvalReference.length > 300)) issues.push({code:'INVALID_APPROVAL_REFERENCE',field:'policy.approvalReference',message:'Invalid approval reference.'});
    }

    if (!Array.isArray(input.relations) || input.relations.length > 100) issues.push({code:'INVALID_RELATIONS',field:'relations',message:'relations array (max 100) required.'});
    else input.relations.forEach((r,i) => {
      if (!isRecord(r) || !oneOf(['supports','contradicts','duplicates','depends_on','implements','supersedes','derived_from','related_to'],r.type) || !isText(r.targetId,200) || Object.keys(r).some(k=>!['type','targetId'].includes(k))) issues.push({code:'INVALID_RELATION',field:`relations[${i}]`,message:'Invalid relation.'});
    });
    if (!Array.isArray(input.evidence) || input.evidence.length > 100) issues.push({code:'INVALID_EVIDENCE',field:'evidence',message:'evidence array (max 100) required.'});
    else input.evidence.forEach((e,i) => {
      const field=`evidence[${i}]`;
      if (!isRecord(e) || !oneOf(['source','test','ci','runtime','review','deployment','business_metric'],e.type) || !oneOf(['PRESENT','MISSING','UNKNOWN','DIVERGENT'],e.status) || Object.keys(e).some(k=>!['type','status','reference','observedAt','note'].includes(k))) { issues.push({code:'INVALID_EVIDENCE_ENTRY',field,message:'Invalid evidence entry.'}); return; }
      if (e.reference !== undefined && e.reference !== null && (typeof e.reference !== 'string' || e.reference.length > 500)) issues.push({code:'INVALID_EVIDENCE_REFERENCE',field:`${field}.reference`,message:'Invalid reference.'});
      if (e.observedAt !== undefined && e.observedAt !== null && !isDate(e.observedAt)) issues.push({code:'INVALID_EVIDENCE_TIME',field:`${field}.observedAt`,message:'Invalid observation time.'});
      if (e.note !== undefined && (typeof e.note !== 'string' || e.note.length > 1000)) issues.push({code:'INVALID_EVIDENCE_NOTE',field:`${field}.note`,message:'Invalid note.'});
    });
    if (input.supersedes !== undefined && (!Array.isArray(input.supersedes) || input.supersedes.length > 100 || input.supersedes.some(x=>typeof x!=='string'||x.length>200))) issues.push({code:'INVALID_SUPERSEDES',field:'supersedes',message:'Invalid supersedes list.'});
    const acceptance=input.acceptance;
    if (acceptance !== undefined && (!Array.isArray(acceptance) || acceptance.length > 50 || acceptance.some(x=>typeof x!=='string'||x.length>1000))) issues.push({code:'INVALID_LIST',field:'acceptance',message:'Invalid acceptance list.'});
    const tags=input.tags;
    if (tags !== undefined && (!Array.isArray(tags) || tags.length > 50 || tags.some(x=>typeof x!=='string'||x.length>100))) issues.push({code:'INVALID_LIST',field:'tags',message:'Invalid tags list.'});
    if (input.nextAction !== undefined && (typeof input.nextAction !== 'string' || input.nextAction.length > 1000)) issues.push({code:'INVALID_NEXT_ACTION',field:'nextAction',message:'Invalid nextAction.'});
    if (issues.length) return invalid(issues);

    const envelope = Object.freeze({
      ...input,
      source:Object.freeze({...source as Record<string,unknown>}),
      policy:Object.freeze({...policy as Record<string,unknown>}),
      relations:Object.freeze((input.relations as object[]).map(x=>Object.freeze({...x}))),
      evidence:Object.freeze((input.evidence as object[]).map(x=>Object.freeze({...x}))),
      ...(input.supersedes !== undefined ? {supersedes:Object.freeze([...(input.supersedes as string[])])} : {}),
      ...(input.acceptance !== undefined ? {acceptance:Object.freeze([...(input.acceptance as string[])])} : {}),
      ...(input.tags !== undefined ? {tags:Object.freeze([...(input.tags as string[])])} : {}),
    }) as unknown as KnowledgeEnvelope;
    const p = policy as Record<string,unknown>;
    return {
      validation:'VALID',
      publicExportAllowed:input.visibility==='public' && p.reviewedForPublicRelease===true && p.containsRawSourceContent===false && !['restricted','unknown'].includes(String(p.sensitivity ?? 'unknown')),
      evidence:'STRUCTURE_AND_DISCLOSURE_POLICY_ONLY',
      envelope,
      issues:Object.freeze([]),
    };
  } catch {
    return invalid([{code:'INSPECTION_FAILED',field:'$',message:'Could not safely inspect input; stopped without side effects.'}]);
  }
}
