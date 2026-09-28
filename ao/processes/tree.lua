-- SEJIRE Tree Process (AO / aos)
-- Spec:       docs/processes/TREE.md
-- Messages:   docs/processes/MESSAGE_CATALOG.md
-- Protocol:   docs/PROTOCOL.md
-- Invariant:  every mutation is a new immutable commit. History is never erased.
-- Deploy:     see ao/README.md (aos + HyperBEAM)

local json = require("json")

Tree = Tree or {
  id = ao.id,
  title = "Untitled Family Tree",
  owners = {},
  head = nil,
  commits = {},
  versions = {},
  next_version = 1,
  created_at = nil
}

local function reply(msg, tags, data)
  msg.reply({
    Data = data or "",
    Tags = tags or {}
  })
end

local function is_owner(addr)
  if not next(Tree.owners) then
    return true -- bootstrap: first signer becomes owner on Init/Commit
  end
  return Tree.owners[addr] == true
end

local function ensure_owner_boot(addr)
  if not next(Tree.owners) then
    Tree.owners[addr] = true
  end
end

local function patch_http()
  -- Expose compact public state via HyperBEAM patch device
  Send({
    device = "patch@1.0",
    sejire = {
      title = Tree.title,
      head = Tree.head,
      version_count = Tree.next_version - 1,
      owners = Tree.owners
    }
  })
end

local function person_count(snapshot)
  local n = 0
  if snapshot and snapshot.persons then
    for _ in pairs(snapshot.persons) do
      n = n + 1
    end
  end
  return n
end

local function person_active(p)
  return p ~= nil and p.tombstone ~= true
end

--- HEAD snapshot, or a historical commit if Tags["Commit-Id"] is set.
local function resolve_snapshot(msg)
  if not Tree.head then
    return nil, "EmptyTree", nil
  end
  local cid = msg.Tags["Commit-Id"]
  if type(cid) == "string" and #cid > 0 then
    local c = Tree.commits[cid]
    if not c then
      return nil, "NotFound", nil
    end
    return c.snapshot, nil, cid
  end
  local c = Tree.commits[Tree.head]
  return c.snapshot, nil, Tree.head
end

--- Father / mother split — same rules as apps/web splitParents().
local function split_parents(snapshot, person_id)
  local person = snapshot.persons and snapshot.persons[person_id]
  if not person then
    return nil, nil
  end
  local parents = {}
  for _, id in ipairs(person.parents or {}) do
    local p = snapshot.persons[id]
    if person_active(p) then
      table.insert(parents, p)
    end
  end
  local father, mother
  for _, p in ipairs(parents) do
    if p.sex == "M" and not father then
      father = p
    elseif p.sex == "F" and not mother then
      mother = p
    end
  end
  local rest = {}
  for _, p in ipairs(parents) do
    if p ~= father and p ~= mother then
      table.insert(rest, p)
    end
  end
  if not father and #rest > 0 then
    father = table.remove(rest, 1)
  end
  if not mother and #rest > 0 then
    mother = table.remove(rest, 1)
  end
  if not father and not mother and parents[1] then
    father = parents[1]
  end
  if father and not mother then
    for _, p in ipairs(parents) do
      if p.id ~= father.id then
        mother = p
        break
      end
    end
  end
  return father and father.id or nil, mother and mother.id or nil
end

--- BFS ancestors including self at distance 0 (mirrors kinship.ts ancestorsOf).
local function ancestors_of(snapshot, person_id)
  local persons = snapshot.persons or {}
  local dist = {}
  local queue = { person_id }
  dist[person_id] = 0
  local qi = 1
  while qi <= #queue do
    local id = queue[qi]
    qi = qi + 1
    local p = persons[id]
    if person_active(p) then
      local d = dist[id]
      for _, parent_id in ipairs(p.parents or {}) do
        if dist[parent_id] == nil then
          dist[parent_id] = d + 1
          table.insert(queue, parent_id)
        end
      end
    end
  end
  return dist
end

local function kinship_code(da, db)
  if da == 1 and db == 0 then return "child" end
  if da == 0 and db == 1 then return "parent" end
  if da == 2 and db == 0 then return "grandchild" end
  if da == 0 and db == 2 then return "grandparent" end
  if da == 1 and db == 1 then return "sibling" end
  if da == 2 and db == 1 then return "nibling" end
  if da == 1 and db == 2 then return "pibling" end
  if da == 2 and db == 2 then return "cousin" end
  return "related"
end

local JETI_ATA_MAX = 7

Handlers.add(
  "Info",
  Handlers.utils.hasMatchingTag("Action", "Info"),
  function(msg)
    reply(msg, { Action = "Info-Response" }, json.encode({
      protocol = "sejire/tree/v1",
      release = "sejire/v0.3",
      process = Tree.id,
      title = Tree.title,
      head = Tree.head,
      version_count = Tree.next_version - 1,
      owners = Tree.owners,
      created_at = Tree.created_at,
      queries = { "GetAncestors", "GetJetiAta", "Relate" }
    }))
  end
)

Handlers.add(
  "Init",
  Handlers.utils.hasMatchingTag("Action", "Init"),
  function(msg)
    if Tree.created_at then
      reply(msg, { Action = "Error", ["Error-Code"] = "AlreadyInitialized" }, "Tree already initialized")
      return
    end
    local title = msg.Tags.Title or "Untitled Family Tree"
    Tree.title = title
    Tree.created_at = msg.Timestamp or tostring(os.time())
    ensure_owner_boot(msg.From)
    Tree.owners[msg.From] = true
    patch_http()
    reply(msg, { Action = "Init-Response" }, json.encode({
      process = Tree.id,
      title = Tree.title,
      owners = Tree.owners
    }))
  end
)

Handlers.add(
  "GetHead",
  Handlers.utils.hasMatchingTag("Action", "GetHead"),
  function(msg)
    if not Tree.head then
      reply(msg, { Action = "GetHead-Response" }, json.encode({ head = nil, commit = nil }))
      return
    end
    local c = Tree.commits[Tree.head]
    reply(msg, { Action = "GetHead-Response" }, json.encode({ head = Tree.head, commit = c }))
  end
)

Handlers.add(
  "GetCommit",
  Handlers.utils.hasMatchingTag("Action", "GetCommit"),
  function(msg)
    local id = msg.Tags["Commit-Id"]
    if not id or not Tree.commits[id] then
      reply(msg, { Action = "Error", ["Error-Code"] = "NotFound" }, "Commit not found")
      return
    end
    reply(msg, { Action = "GetCommit-Response" }, json.encode(Tree.commits[id]))
  end
)

Handlers.add(
  "History",
  Handlers.utils.hasMatchingTag("Action", "History"),
  function(msg)
    local list = {}
    for v = 1, Tree.next_version - 1 do
      local cid = Tree.versions[v]
      local c = Tree.commits[cid]
      if c then
        table.insert(list, {
          commit_id = c.commit_id,
          version = c.version,
          parent_commit_id = c.parent_commit_id,
          author = c.author,
          created_at = c.created_at,
          message = c.message,
          person_count = person_count(c.snapshot)
        })
      end
    end
    reply(msg, { Action = "History-Response" }, json.encode({
      head = Tree.head,
      commits = list
    }))
  end
)

Handlers.add(
  "GetAncestors",
  Handlers.utils.hasMatchingTag("Action", "GetAncestors"),
  function(msg)
    local snapshot, err, commit_id = resolve_snapshot(msg)
    if not snapshot then
      reply(msg, { Action = "Error", ["Error-Code"] = err }, err == "EmptyTree" and "Tree has no commits" or "Commit not found")
      return
    end
    local person_id = msg.Tags["Person-Id"]
    if type(person_id) ~= "string" or #person_id == 0 then
      reply(msg, { Action = "Error", ["Error-Code"] = "BadPersonId" }, "Person-Id tag required")
      return
    end
    if not snapshot.persons[person_id] then
      reply(msg, { Action = "Error", ["Error-Code"] = "NotFound" }, "Person not found")
      return
    end
    local max_depth = tonumber(msg.Tags["Max-Depth"] or "")
    local dist = ancestors_of(snapshot, person_id)
    local list = {}
    for id, d in pairs(dist) do
      if not max_depth or d <= max_depth then
        table.insert(list, { id = id, distance = d })
      end
    end
    table.sort(list, function(a, b)
      if a.distance == b.distance then
        return a.id < b.id
      end
      return a.distance < b.distance
    end)
    reply(msg, { Action = "GetAncestors-Response" }, json.encode({
      schema = "sejire/ancestors/v1",
      person_id = person_id,
      commit_id = commit_id,
      ancestors = list
    }))
  end
)

Handlers.add(
  "GetJetiAta",
  Handlers.utils.hasMatchingTag("Action", "GetJetiAta"),
  function(msg)
    local snapshot, err, commit_id = resolve_snapshot(msg)
    if not snapshot then
      reply(msg, { Action = "Error", ["Error-Code"] = err }, err == "EmptyTree" and "Tree has no commits" or "Commit not found")
      return
    end
    local person_id = msg.Tags["Person-Id"]
    if type(person_id) ~= "string" or #person_id == 0 then
      reply(msg, { Action = "Error", ["Error-Code"] = "BadPersonId" }, "Person-Id tag required")
      return
    end
    local start = snapshot.persons[person_id]
    if not person_active(start) then
      reply(msg, { Action = "Error", ["Error-Code"] = "NotFound" }, "Person not found")
      return
    end
    local line = {}
    local seen = {}
    local current_id = person_id
    while current_id and not seen[current_id] and #line < JETI_ATA_MAX do
      seen[current_id] = true
      local p = snapshot.persons[current_id]
      if not person_active(p) then
        break
      end
      table.insert(line, {
        generation = #line,
        id = p.id,
        name = p.name,
        sex = p.sex,
        born = p.born,
        died = p.died
      })
      local father_id = split_parents(snapshot, current_id)
      current_id = father_id
    end
    reply(msg, { Action = "GetJetiAta-Response" }, json.encode({
      schema = "sejire/jeti-ata/v1",
      person_id = person_id,
      commit_id = commit_id,
      max = JETI_ATA_MAX,
      complete = #line >= JETI_ATA_MAX,
      line = line
    }))
  end
)

Handlers.add(
  "Relate",
  Handlers.utils.hasMatchingTag("Action", "Relate"),
  function(msg)
    local snapshot, err, commit_id = resolve_snapshot(msg)
    if not snapshot then
      reply(msg, { Action = "Error", ["Error-Code"] = err }, err == "EmptyTree" and "Tree has no commits" or "Commit not found")
      return
    end
    local a_id = msg.Tags["Person-A"]
    local b_id = msg.Tags["Person-B"]
    if type(a_id) ~= "string" or #a_id == 0 or type(b_id) ~= "string" or #b_id == 0 then
      reply(msg, { Action = "Error", ["Error-Code"] = "BadPersonId" }, "Person-A and Person-B tags required")
      return
    end
    if not snapshot.persons[a_id] or not snapshot.persons[b_id] then
      reply(msg, { Action = "Error", ["Error-Code"] = "NotFound" }, "Person not found")
      return
    end
    if a_id == b_id then
      reply(msg, { Action = "Relate-Response" }, json.encode({
        schema = "sejire/relate/v1",
        a = a_id,
        b = b_id,
        commit_id = commit_id,
        lca = a_id,
        da = 0,
        db = 0,
        degree = 0,
        code = "self"
      }))
      return
    end
    local a = ancestors_of(snapshot, a_id)
    local b = ancestors_of(snapshot, b_id)
    local best_id, best_da, best_db
    for id, da in pairs(a) do
      local db = b[id]
      if db ~= nil then
        if not best_id or (da + db) < (best_da + best_db) then
          best_id, best_da, best_db = id, da, db
        end
      end
    end
    if not best_id then
      reply(msg, { Action = "Relate-Response" }, json.encode({
        schema = "sejire/relate/v1",
        a = a_id,
        b = b_id,
        commit_id = commit_id,
        code = "unrelated"
      }))
      return
    end
    reply(msg, { Action = "Relate-Response" }, json.encode({
      schema = "sejire/relate/v1",
      a = a_id,
      b = b_id,
      commit_id = commit_id,
      lca = best_id,
      da = best_da,
      db = best_db,
      degree = best_da + best_db,
      code = kinship_code(best_da, best_db)
    }))
  end
)

Handlers.add(
  "Commit",
  Handlers.utils.hasMatchingTag("Action", "Commit"),
  function(msg)
    ensure_owner_boot(msg.From)
    if not is_owner(msg.From) then
      reply(msg, { Action = "Error", ["Error-Code"] = "Unauthorized" }, "Only owners can commit")
      return
    end

    local ok, body = pcall(json.decode, msg.Data or "{}")
    if not ok or type(body) ~= "table" then
      reply(msg, { Action = "Error", ["Error-Code"] = "BadPayload" }, "Data must be JSON object")
      return
    end

    local snapshot = body.snapshot
    if type(snapshot) ~= "table" or type(snapshot.persons) ~= "table" then
      reply(msg, { Action = "Error", ["Error-Code"] = "BadSnapshot" }, "snapshot.persons required")
      return
    end

    -- Parent must match current HEAD (linear history, no silent forks in v1).
    -- Only a string parent_commit_id is validated; JSON null / omit means "use HEAD".
    local parent = Tree.head
    if type(body.parent_commit_id) == "string" and body.parent_commit_id ~= parent then
      reply(msg, { Action = "Error", ["Error-Code"] = "StaleParent" }, "parent_commit_id must equal current HEAD")
      return
    end

    local version = Tree.next_version
    local commit_id = "c_" .. tostring(version) .. "_" .. tostring(msg.Id or msg.Timestamp or os.time())

    local commit = {
      schema = "sejire/commit/v1",
      tree_id = Tree.id,
      commit_id = commit_id,
      parent_commit_id = parent,
      version = version,
      author = msg.From,
      created_at = msg.Timestamp or tostring(os.time()),
      message = body.message or ("Commit v" .. tostring(version)),
      snapshot = snapshot
    }

    Tree.commits[commit_id] = commit
    Tree.versions[version] = commit_id
    Tree.head = commit_id
    Tree.next_version = version + 1

    if body.title and type(body.title) == "string" and #body.title > 0 then
      Tree.title = body.title
    end

    patch_http()
    reply(msg, {
      Action = "Commit-Response",
      ["Commit-Id"] = commit_id,
      Version = tostring(version)
    }, json.encode(commit))
  end
)

Handlers.add(
  "AddOwner",
  Handlers.utils.hasMatchingTag("Action", "AddOwner"),
  function(msg)
    if not is_owner(msg.From) then
      reply(msg, { Action = "Error", ["Error-Code"] = "Unauthorized" }, "Only owners can add owners")
      return
    end
    local addr = msg.Tags.Address
    if not addr or #addr == 0 then
      reply(msg, { Action = "Error", ["Error-Code"] = "BadAddress" }, "Address tag required")
      return
    end
    Tree.owners[addr] = true
    patch_http()
    reply(msg, { Action = "AddOwner-Response" }, json.encode({ owners = Tree.owners }))
  end
)

Handlers.add(
  "RemoveOwner",
  Handlers.utils.hasMatchingTag("Action", "RemoveOwner"),
  function(msg)
    if not is_owner(msg.From) then
      reply(msg, { Action = "Error", ["Error-Code"] = "Unauthorized" }, "Only owners can remove owners")
      return
    end
    local addr = msg.Tags.Address
    if not addr or #addr == 0 then
      reply(msg, { Action = "Error", ["Error-Code"] = "BadAddress" }, "Address tag required")
      return
    end

    local count = 0
    for _ in pairs(Tree.owners) do
      count = count + 1
    end
    if count <= 1 and Tree.owners[addr] then
      reply(msg, { Action = "Error", ["Error-Code"] = "LastOwner" }, "Cannot remove the last owner")
      return
    end

    Tree.owners[addr] = nil
    patch_http()
    reply(msg, { Action = "RemoveOwner-Response" }, json.encode({ owners = Tree.owners }))
  end
)

Handlers.add(
  "Ping",
  Handlers.utils.hasMatchingTag("Action", "Ping"),
  function(msg)
    reply(msg, { Action = "Pong" }, "sejire-ok")
  end
)

-- Last: unknown Action. Matcher must skip named handlers (AO continues the list).
local TREE_KNOWN_ACTIONS = {
  Ping = true,
  Info = true,
  Init = true,
  GetHead = true,
  GetCommit = true,
  History = true,
  Commit = true,
  AddOwner = true,
  RemoveOwner = true,
  GetAncestors = true,
  GetJetiAta = true,
  Relate = true
}

Handlers.add(
  "UnknownAction",
  function(msg)
    local a = msg.Tags and msg.Tags.Action
    return type(a) == "string" and #a > 0 and not TREE_KNOWN_ACTIONS[a]
  end,
  function(msg)
    reply(msg, { Action = "Error", ["Error-Code"] = "UnknownAction" }, "Unknown Action: " .. tostring(msg.Tags.Action))
  end
)

print("SEJIRE tree process loaded: " .. tostring(ao.id))
