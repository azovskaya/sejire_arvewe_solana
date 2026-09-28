-- SEJIRE Factory Process (AO / aos)
-- Spec: docs/processes/FACTORY.md
-- Messages: docs/processes/MESSAGE_CATALOG.md
-- Spawns / registers Tree Processes. Does NOT store genealogy graphs.

local json = require("json")

Factory = Factory or {
  protocol = "sejire/factory/v1",
  trees = {},
  by_owner = {}
}

local function reply(msg, tags, data)
  msg.reply({
    Data = data or "",
    Tags = tags or {}
  })
end

local function push_owner_index(owner, process_id)
  local list = Factory.by_owner[owner]
  if not list then
    list = {}
    Factory.by_owner[owner] = list
  end
  for _, id in ipairs(list) do
    if id == process_id then
      return
    end
  end
  table.insert(list, process_id)
end

local function count_trees()
  local n = 0
  for _ in pairs(Factory.trees) do
    n = n + 1
  end
  return n
end

local function patch_http()
  Send({
    device = "patch@1.0",
    sejire_factory = {
      protocol = Factory.protocol,
      tree_count = count_trees()
    }
  })
end

Handlers.add(
  "Ping",
  Handlers.utils.hasMatchingTag("Action", "Ping"),
  function(msg)
    reply(msg, { Action = "Pong" }, "sejire-factory-ok")
  end
)

Handlers.add(
  "Info",
  Handlers.utils.hasMatchingTag("Action", "Info"),
  function(msg)
    reply(msg, { Action = "Info-Response" }, json.encode({
      protocol = Factory.protocol,
      release = "sejire/v0.3",
      process = ao.id,
      tree_count = count_trees()
    }))
  end
)

Handlers.add(
  "SpawnTree",
  Handlers.utils.hasMatchingTag("Action", "SpawnTree"),
  function(msg)
    local title = msg.Tags.Title or "Untitled Family Tree"
    local created_at = msg.Timestamp or tostring(os.time())

    -- Spawn a new AO process. The returned id is the Tree Process id.
    -- Note: spawned process must `.load` tree.lua (or be created from a
    -- prebuilt SEJIRE tree module) — see docs/flows/01-create-tree.md
    local spawn_result = ao.spawn(ao.env.Module.Id, {
      Tags = {
        { name = "App-Name", value = "SEJIRE" },
        { name = "Protocol", value = "sejire/v0.3" },
        { name = "Role", value = "Tree" },
        { name = "Title", value = title },
        { name = "Authority", value = msg.From }
      }
    })

    local process_id = spawn_result and (spawn_result.Process or spawn_result.process or spawn_result) or nil
    if type(process_id) == "table" then
      process_id = process_id.Process or process_id.process or process_id.id
    end

    if not process_id or process_id == "" then
      -- Fallback deterministic placeholder for environments where spawn
      -- return shape differs; client should still prefer real Process id.
      process_id = "pending_" .. tostring(msg.Id or created_at)
    end

    local meta = {
      process_id = tostring(process_id),
      title = title,
      owner = msg.From,
      created_at = created_at,
      spawn_msg = tostring(msg.Id or "")
    }

    Factory.trees[meta.process_id] = meta
    push_owner_index(msg.From, meta.process_id)
    patch_http()

    reply(msg, {
      Action = "SpawnTree-Response",
      ["Process-Id"] = meta.process_id
    }, json.encode(meta))
  end
)

Handlers.add(
  "RegisterTree",
  Handlers.utils.hasMatchingTag("Action", "RegisterTree"),
  function(msg)
    -- Allow registering an already-created Tree Process id (manual spawn path)
    local process_id = msg.Tags["Process-Id"]
    if not process_id or process_id == "" then
      reply(msg, { Action = "Error", ["Error-Code"] = "BadProcessId" }, "Process-Id required")
      return
    end
    local title = msg.Tags.Title or "Untitled Family Tree"
    local meta = {
      process_id = process_id,
      title = title,
      owner = msg.From,
      created_at = msg.Timestamp or tostring(os.time()),
      spawn_msg = tostring(msg.Id or "")
    }
    Factory.trees[process_id] = meta
    push_owner_index(msg.From, process_id)
    patch_http()
    reply(msg, { Action = "RegisterTree-Response" }, json.encode(meta))
  end
)

Handlers.add(
  "ListTrees",
  Handlers.utils.hasMatchingTag("Action", "ListTrees"),
  function(msg)
    local owner = msg.Tags.Owner or msg.From
    local ids = Factory.by_owner[owner] or {}
    local trees = {}
    for _, id in ipairs(ids) do
      local meta = Factory.trees[id]
      if meta then
        table.insert(trees, meta)
      end
    end
    reply(msg, { Action = "ListTrees-Response" }, json.encode({
      owner = owner,
      trees = trees
    }))
  end
)

-- Last: unknown Action. Matcher must skip named handlers (AO continues the list).
local FACTORY_KNOWN_ACTIONS = {
  Ping = true,
  Info = true,
  SpawnTree = true,
  RegisterTree = true,
  ListTrees = true
}

Handlers.add(
  "UnknownAction",
  function(msg)
    local a = msg.Tags and msg.Tags.Action
    return type(a) == "string" and #a > 0 and not FACTORY_KNOWN_ACTIONS[a]
  end,
  function(msg)
    reply(msg, { Action = "Error", ["Error-Code"] = "UnknownAction" }, "Unknown Action: " .. tostring(msg.Tags.Action))
  end
)

print("SEJIRE factory process loaded: " .. tostring(ao.id))
