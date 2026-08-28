from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
SERVER=ROOT/'_read_123_zip_20260821_180410'/'server.js'
text=SERVER.read_text(encoding='utf-8')

# 1) Expose local/provider lifecycle fields to the UI without changing existing API fields.
text,count=re.subn(
    r"(function taskPublic\(t\) \{\s*return \{\s*id:t\.id,status:t\.status,progress:t\.progress,nodeType:t\.nodeType,providerId:t\.providerId,modelId:t\.modelId,\s*output:t\.output\|\|null,error:t\.error\|\|null,createdAt:t\.createdAt,updatedAt:t\.updatedAt,attempt:t\.attempt\|\|0,\s*maxRetries:t\.maxRetries\|\|0,cancelRequested:Boolean\(t\.cancelRequested\),priority:Number\(t\.priority\?\?50\),logs:t\.logs\|\|\[\])\s*(\};\s*\})",
    r"\1,\n    providerStatus:t.providerStatus||'',resultStatus:t.resultStatus||'',upstreamTaskId:t.upstreamTaskId||'',\n    providerSucceededAt:t.providerSucceededAt||null,resultSavedAt:t.resultSavedAt||null,lastPollAt:t.lastPollAt||null,lastError:t.lastError||null\n  \2",
    text,
    count=1,
    flags=re.S,
)
if count!=1 and 'providerStatus:t.providerStatus' not in text:
    raise SystemExit('taskPublic patch marker not found')

old_poll="""    const assessment=ProviderRuntimeCore.classifyAsyncPoll(polled,config,'video');
    const status=assessment.status,progressRaw=assessment.progress;
    updateTask(task,{status:'polling',progress:Number.isFinite(progressRaw)?Math.max(20,Math.min(96,progressRaw)):Math.min(94,20+checks*4)});
    if(assessment.state==='failure')throw new Error(ProviderRuntimeCore.formatFailure(assessment,'上游视频任务失败'));
    const output=assessment.output;
    if(assessment.state==='success'){
      if(output!=null)return normalizeOutput(output,'video',provider);
      const content=await downloadStandardVideoContent(task,provider,config,taskId);
      if(content)return content;
      throw new Error(`视频任务状态为 ${status||'成功'}，但没有解析到视频结果 URL，且未配置可用的 contentPath。`);
    }
  }
  throw new Error('标准异步视频任务超时');
}"""
new_poll="""    const assessment=ProviderRuntimeCore.classifyAsyncPoll(polled,config,'video');
    const status=assessment.status,progressRaw=assessment.progress;
    const pollPatch={status:'polling',lastPollAt:new Date().toISOString(),progress:Number.isFinite(progressRaw)?Math.max(20,Math.min(96,progressRaw)):Math.min(94,20+checks*4)};
    if(assessment.providerSucceeded){
      Object.assign(pollPatch,{status:'provider_succeeded',providerStatus:'succeeded',resultStatus:assessment.output!=null?'available':'pending',providerOutput:polled,providerSucceededAt:new Date().toISOString()});
    }
    updateTask(task,pollPatch);
    if(assessment.state==='failure')throw new Error(ProviderRuntimeCore.formatFailure(assessment,'上游视频任务失败'));
    const output=assessment.output;
    if(assessment.state==='success'){
      if(output!=null)return normalizeOutput(output,'video',provider);
      try{
        const content=await downloadStandardVideoContent(task,provider,config,taskId);
        if(content)return content;
      }catch(contentError){
        taskLog(task,`上游已成功，结果文件暂未可取：${contentError?.message||contentError}`,'warn');
        updateTask(task,{status:'result_pending',providerStatus:'succeeded',resultStatus:'pending',lastError:contentError?.message||String(contentError)});
      }
      // Some providers publish `succeeded` before the CDN/result URL becomes visible.
      // Continue querying the same upstream task instead of turning success into failure.
      continue;
    }
  }
  const fresh=store.getTask(task.id)||task;
  if(fresh.providerStatus==='succeeded'){
    const pending=new Error('上游视频已生成成功，结果地址仍在同步；将继续追取，不会重新生成。');
    pending.code='RESULT_PENDING';
    throw pending;
  }
  throw new Error('标准异步视频任务超时');
}"""
if old_poll in text:
    text=text.replace(old_poll,new_poll,1)
elif "pending.code='RESULT_PENDING'" not in text:
    raise SystemExit('standard video poll patch marker not found')

old_catch="""    if(err?.code==='TASK_CANCELLED'||fresh.cancelRequested){updateTask(fresh,{status:'canceled',error:null,progress:fresh.progress});taskLog(fresh,'任务已取消','warn');return}
    const attempt=Number(fresh.attempt||0)+1;"""
new_catch="""    if(err?.code==='TASK_CANCELLED'||fresh.cancelRequested){updateTask(fresh,{status:'canceled',error:null,progress:fresh.progress});taskLog(fresh,'任务已取消','warn');return}
    if(err?.code==='RESULT_PENDING'||fresh.providerStatus==='succeeded'){
      updateTask(fresh,{status:'queued',providerStatus:'succeeded',resultStatus:'pending',error:null,lastError:err?.message||String(err),progress:Math.max(20,Number(fresh.progress||0)),cancelRequested:false});
      taskLog(fresh,`上游已成功，等待结果同步后继续追取：${err?.message||err}`,'warn');
      setTimeout(processTaskQueue,5000);
      return;
    }
    const attempt=Number(fresh.attempt||0)+1;"""
if old_catch in text:
    text=text.replace(old_catch,new_catch,1)
elif "err?.code==='RESULT_PENDING'" not in text:
    raise SystemExit('runTaskById catch patch marker not found')

SERVER.write_text(text,encoding='utf-8')
print('local core task lifecycle server patch applied')
