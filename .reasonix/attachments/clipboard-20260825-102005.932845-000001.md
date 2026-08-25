# 幸福颐养数智化平台 — 运营后台端 API 接口设计

> 版本：v1.4 ｜ 依据：PRD v2.7 + 数据库设计 v1.10
> 说明：接口逻辑留空，仅定义完整契约（方法/路径/入参/出参）。所有接口默认需登录态（JWT），按权限编码拦截。v1.3 依据运营后台批量管理诉求，为机构/会员/服务/耗材/工单/活动/线索/消息/CMS/轮播等模块补充一致化的 `batch-*` 批量操作接口。v1.2 依据数据库 v1.9 新增 §5.4 机构服务关联配置（institution_services，支持机构配置上门服务上下架）。v1.1 依据数据库 v1.8 补齐 cms/耗材关联/资质/线索转派等接口。v1.4 依据数据库 v1.10 同步版本基线（新增 `service_records.service_consumables` 工单耗材实耗留痕，不影响运营后台接口契约）。

---

## 0. 通用约定

> **本端响应结构、分页、时间戳与金额格式、错误码、状态枚举、上传与批量操作契约等一律引用《共通API》**（`docs/api/共通-API设计.md`）。本端仅保留特有约定。

### 0.1 统一响应结构 / 分页 / 错误码
- 统一响应：`{code, message, data}`（`code=0` 成功，非 0 见共通 §1、§4）。
- 列表接口分页入参 `page/page_size/keyword` 与分页响应 `{list,total,page,page_size}`：见共通 §2。
- 错误码统一收敛为短码 `400/401/403/404/429/500/600`：见共通 §4。

### 0.2 鉴权（本端特有）
- Header：`Authorization: Bearer ***`
- 运营后台登录颁发独立 token，基于 `admins` 账号
- 每个接口标注权限编码（对应 `permissions.code`），授权判定见共通 §3.3 数据权限

### 0.3 时间戳
- 时间字段均使用 **UTC 秒数（BIGINT）**、金额 `DECIMAL(10,2)`，约定见共通 §5

---

## 1. 认证与会话（Auth）

| 接口 | 方法 | 权限 | 说明 |
|------|------|------|------|
| 后台登录 | POST `/api/admin/auth/login` | 公开 | 账号密码登录 |
| 获取当前管理员信息 | GET `/api/admin/auth/profile` | 登录态 | 含角色、权限码列表 |
| 修改密码 | POST `/api/admin/auth/change-password` | 登录态 | 修改当前账号密码 |
| 登出 | POST `/api/admin/auth/logout` | 登录态 | 注销会话 |

### 1.1 后台登录
**入参：**
```json
{
  "username": "admin",       // 登录账号，必填
  "password": "******",      // 密码，必填
  "captcha": "A1B2",         // 图形验证码，可选
  "captcha_id": "uuid"       // 验证码 ID，可选
}
```
**出参 data：**
```json
{
  "token": "jwt_token",
  "expires_in": 86400,
  "admin": {
    "id": 1, "username": "admin", "nickname": "系统管理员",
    "avatar_url": null, "phone": "138****0000", "email": null,
    "last_login_at": 1755568200, "last_login_ip": "127.0.0.1",
    "roles": ["finance", "operator"],
    "permissions": ["order:view", "order:manage", "finance:reconcile"]
  }
}
```

### 1.2 获取当前管理员
GET `/api/admin/auth/profile`
**出参 data：** 同上方 `admin` 对象（含 roles / permissions 权限码数组）

### 1.3 修改密码
入参：
```json
{ "old_password": "旧密码", "new_password": "新密码" }
```

---

## 2. 系统与权限管理

### 2.1 管理员账号管理
| 接口 | 方法 | 权限 `system:admin` |
|------|------|------|
| 管理员列表 | GET `/api/admin/admins` | 分页 |
| 管理员详情 | GET `/api/admin/admins/:id` | |
| 新增管理员 | POST `/api/admin/admins` | |
| 编辑管理员 | PUT `/api/admin/admins/:id` | |
| 重置密码 | POST `/api/admin/admins/:id/reset-password` | 默认重置为初始密码 |
| 启用/禁用 | POST `/api/admin/admins/:id/status` | body `{status:1|9}` |
| 分配角色 | POST `/api/admin/admins/:id/roles` | body `{role_ids:[1,2]}` |
| 删除管理员 | DELETE `/api/admin/admins/:id` | |

**新增/编辑入参 body：**
```json
{
  "username": "zhangsan",
  "password": "仅新增时必填",
  "nickname": "张三",
  "phone": "13800000000",
  "email": "z@x.com",
  "avatar_url": "https://...",
  "status": 1,
  "role_ids": [1, 2]
}
```

**管理员列表出参 data：**
```json
{
  "list": [{
    "id": 1, "username": "admin", "nickname": "系统管理员",
    "phone": "138****0000", "email": null, "status": 1,
    "last_login_at": 2025568200, "last_login_ip": "127.0.0.1",
    "roles": [{"id":1,"role_name":"超管","role_code":"super"}],
    "created_at": 2025568000
  }],
  "total": 10, "page": 1, "page_size": 10
}
```

### 2.2 角色管理
| 接口 | 方法 | 权限 `system:role` |
|------|------|------|
| 角色列表 | GET `/api/admin/roles` | 分页 + 全部（?all=1） |
| 角色详情 | GET `/api/admin/roles/:id` | 含已分配权限 |
| 新增角色 | POST `/api/admin/roles` | |
| 编辑角色 | PUT `/api/admin/roles/:id` | |
| 分配权限 | POST `/api/admin/roles/:id/permissions` | body `{permission_ids:[...]}` |
| 启用/禁用 | POST `/api/admin/roles/:id/status` | |
| 删除角色 | DELETE `/api/admin/roles/:id` | |

**角色新增/编辑 body：**
```json
{
  "role_name": "财务专员",
  "role_code": "finance",   // 唯一，新增必填
  "description": "负责订单退款与对账",
  "status": 1,
  "permission_ids": [10, 11, 12]
}
```

**角色详情出参 data：**
```json
{
  "id": 3, "role_name": "财务专员", "role_code": "finance", "description": "",
  "status": 1,
  "permissions": [{"id":10,"code":"order:manage","module":"order","name":"管理订单"}]
}
```

### 2.3 权限管理（按模块扁平化）
> 说明：本端**不启用权限树**。权限按业务模块扁平化展示与分配，角色绑定权限直接引用 `permissions.code`（如 `order:view` / `order:manage`），不再依赖 `parent_id` 层级。
> module是功能类，action分为3个：view（只读）、edit（可读、增加、修改）、manage（删除、导入、导出等全部）。


| 接口 | 方法 | 权限 `system:permission` |
|------|------|------|
| 权限列表（按模块分组） | GET `/api/admin/permissions` | 扁平列表，按 module 分组返回，不含树形 children |
| 权限模块列表 | GET `/api/admin/permissions/modules` | 返回全部权限模块名（如 order/member/staff/institution/consume…），供扁平化分组 |

**权限列表（按模块分组）出参 data：**
```json
{
  "modules": ["order", "member", "staff", "institution", "consume", "activity", "lead", "cms"],
  "list": [
    { "id": 1, "module": "order", "action": "view", "code": "order:view", "name": "查看订单" },
    { "id": 2, "module": "order", "action": "manage", "code": "order:manage", "name": "管理订单" }
  ]
}
```

### 2.4 操作日志
| 接口 | 方法 | 权限 `system:operation-log` |
|------|------|------|
| 操作日志列表 | GET `/api/admin/operation-logs` | 分页，可按 admin/action/resource/时间筛选 |
| 操作日志详情 | GET `/api/admin/operation-logs/:id` | |

**列表筛选入参：** `admin_id`, `action`, `resource`, `resource_id`, `start_time`, `end_time`

**出参 data：**
```json
{"list":[{
  "id": 100, "admin_id": 1, "admin_name": "admin",
  "action": "update", "resource": "institution", "resource_id": 5,
  "ip_address": "127.0.0.1", "request_method": "PUT", "request_url": "/api/admin/institutions/5",
  "request_params": {"name":"xx"}, "response_status": 200,
  "duration_ms": 12, "created_at": 2025568200
}]}
```

### 2.5 医护操作日志（已废弃，本期医护操作日志运营端不可见）
> 删除：医护操作日志不在运营后台展示，相关接口不提供。

---

## 3. 机构与人员管理

### 3.1 机构管理
| 接口 | 方法 | 权限 `institution:manage` |
|------|------|------|
| 机构列表 | GET `/api/admin/institutions` | 分页，按类型/状态/关键字 |
| 机构详情 | GET `/api/admin/institutions/:id` | |
| 新增机构 | POST `/api/admin/institutions` | |
| 编辑机构 | PUT `/api/admin/institutions/:id` | |
| 启用/禁用 | POST `/api/admin/institutions/:id/status` | body `{status:1|9}` |
| 批量启用/禁用 | POST `/api/admin/institutions/batch-status` | body `{ids:[...], status:1\|9}` |
| 服务半径变更 | POST `/api/admin/institutions/:id/radius` | body `{radius_km,note}`，备用 |

**机构入参/出参字段 data（映射 institutions，含服务半径扩展）：**
```json
{
  "id": 1, "name": "幸福护理院", "name_en": null,
  "type": 1,                           // 1-护理院 2-驿站
  "address": "xx路1号", "province": "浙江", "city": "杭州", "district": "西湖区",
  "lng": 120.1, "lat": 30.2,
  "service_radius_km": 5.0,            // 服务半径（需补字段）
  "contact_phone": "0571-8888", "manager_name": "王院长", "manager_phone": "138...",
  "status": 1, // 1-启用 9-禁用
  "created_at": 2025568000
}
```
> ✅ v1.8 已补：`institutions.service_radius_km DECIMAL(5,2) NULL`（NULL=不限）。越界校验逻辑：下单地址与机构距离 > 该半径时拒绝或提示。

### 3.2 工作人员管理
| 接口 | 方法 | 权限 `staff:manage` |
|------|------|------|
| 人员列表 | GET `/api/admin/staffs` | 分页，按机构/类型/状态/关键字 |
| 人员详情 | GET `/api/admin/staffs/:id` | 含资质、服务分类、岗位 |
| 新增人员 | POST `/api/admin/staffs` | |
| 编辑人员 | PUT `/api/admin/staffs/:id` | |
| 在职/离职 | POST `/api/admin/staffs/:id/status` | body `{status:1|9, resign_time}` |
| 资质管理 | POST `/api/admin/staffs/:id/credentials` | 新增/更新资质（数组全量替换）|
| 资质快过期提醒 | GET `/api/admin/staffs/expiring-credentials` | 距到期≤30天列表 |

**人员入参/出参 body：**
```json
{
  "institution_id": 1,
  "staff_type": 1,                    // 1-医护管理(能登录医护工作台) 2-医护服务
  "name": "李护士", "phone": "139...", "id_card": "3301...",
  "avatar_url": null,
  "position_id": 2, "title": "护士长",
  "services": [1, 2],       // 服务ID数组
  "credentials": [{
    "credential_name": "护士执业证",   // 资质名称
    "clear_level": "执业护士",          // 等级/类型
    "valid_from": 20260101, "valid_until": 20280101,  // 有效期起止(UTC)
    "issuer": "卫健委",               // 发证机构
    "attachment_url": "https://..."   // 证件附件
  }],
  "status": 1                         // 1-在职 9-离职
}
```
> ✅ v1.8 已补：资质拆分为独立表 `staff_credentials`（见 3.3），支持到期索引/到期提醒/到期限制；`institution_staff.credentials` JSON 仍保留作展示冗余。

### 3.3 人员资质证书管理（staff_credentials）
| 接口 | 方法 | 权限 `staff:credential` | 说明 |
|------|------|------|------|
| 资质列表 | GET `/api/admin/staffs/:staff_id/credentials` | | 按人员查资质，分页 |
| 全平台快到期 | GET `/api/admin/staff-credentials/expiring` | | `?days=30&institution_id=&status=` 到期 ≤N 天 |
| 新增资质 | POST `/api/admin/staff-credentials` | | |
| 编辑资质 | PUT `/api/admin/staff-credentials/:id` | | |
| 启用/作废 | POST `/api/admin/staff-credentials/:id/status` | body `{status:1\|9, remark}` | 9-已过期/作废 |
| 删除资质 | DELETE `/api/admin/staff-credentials/:id` | 软删 | |

**资质入参 body（映射 staff_credentials）：**
```json
{
  "staff_id": 12,
  "institution_id": 1,
  "cred_type": 1,              // 1-执业证书 2-职称证书 3-培训证书 4-健康证 9-其他
  "cred_name": "护士执业证书",
  "cred_no": "3301...",
  "issue_org": "卫健委",
  "issue_date": 1755568000,    // 发证日期 UTC 秒
  "expire_date": 1767225600,   // 到期日期 UTC 秒，NULL 长期有效
  "cred_url": "https://oss.../cert.jpg",
  "status": 1,
  "remark": ""
}
```

**资质列表出参 data：**
```json
{"list":[{
  "id":1,"staff_id":12,"staff_name":"李护士","institution_id":1,
  "cred_type":1,"cred_name":"护士执业证书","cred_no":"3301...",
  "issue_org":"卫健委","issue_date":1755568000,"expire_date":1767225600,
  "cred_url":"https://...","status":1,"days_left":46,"remark":""
}],"total":3,"page":1,"page_size":10}
```
> 说明：`days_left = expire_date - now`（单位天），`status` 由定时任务依据到期日自动置「2-即将到期(≤30天)」「9-已过期」；资质过期可限制该人员接单。

### 3.4 岗位管理
| 接口 | 方法 | 权限 `staff:manage` |
|------|------|------|
| 岗位列表 | GET `/api/admin/positions` | 按机构过滤 |
| 新增岗位 | POST `/api/admin/positions` | |
| 编辑岗位 | PUT `/api/admin/positions/:id` | |
| 启用/禁用/删除 | POST/DELETE `/api/admin/positions/:id/...` | |

**body：** `{institution_id, position_name, position_code, description, status}`

### 3.5 排班管理（预留）
| 接口 | 方法 | 权限 `staff:schedule` |
|------|------|------|
| 排班列表（日历）| GET `/api/admin/schedules` | `?institution_id&staff_id&start_date&end_date&view=day\|week\|month` |
| 新增排班 | POST `/api/admin/schedules` | 批量 |
| 编辑排班 | PUT `/api/admin/schedules/:id` | |
| 删除排班 | DELETE `/api/admin/schedules/:id` | |

**新增排班 body：**
```json
{"list":[{
  "staff_id": 12, "institution_id": 1, "schedule_date": "2026-08-21",
  "shift_type": 1, "start_time": "08:00", "end_time": "12:00",
  "is_rest": 0, "note": ""
}]}
```

**排班列表出参 data：**
```json
{"list":[{
  "id":1,"staff_id":12,"staff_name":"李护士","institution_id":1,
  "schedule_date":"2026-08-21","shift_type":1,
  "start_time":"08:00:00","end_time":"12:00:00","is_rest":0,"note":""
}],"total":20,"page":1,"page_size":20}
```

---

## 4. 会员管理

### 4.1 会员档案
| 接口 | 方法 | 权限 `member:view`/`member:manage` |
|------|------|------|
| 会员列表 | GET `/api/admin/members` | 分页，按名称/手机/机构/标签/风险等级筛选 |
| 会员详情 | GET `/api/admin/members/:id` | 含地址、标签、关系、风险等级 |
| 新增会员 | POST `/api/admin/members` | |
| 编辑会员 | PUT `/api/admin/members/:id` | |
| 会员标签打标 | POST `/api/admin/members/:id/tags` | body `{tag_ids:[...], note}` 仅操作"会员经营标签" |
| 会员标签解除 | DELETE `/api/admin/members/:id/tags/:tagId` | |
| 会员批量打标签 | POST `/api/admin/members/batch-tags` | body `{member_ids:[...], tag_ids:[...], note}`，写 member_tags 关联 |
| 会员批量解除标签 | POST `/api/admin/members/batch-untag` | body `{member_ids:[...], tag_ids:[...]}` |
| 会员禁用 | POST `/api/admin/members/:id/status` | |
| 会员批量启用/禁用 | POST `/api/admin/members/batch-status` | body `{ids:[...], status:1\|9}` |
| Excel 导入 | POST `/api/admin/members/import` | 模板下载 + 校验去重（见 4.3） |

### 4.2 会员详情出参 data：
```json
{
  "id": 1, "name": "张大爷", "gender": 1, "birthday": "1945-06-01",
  "id_card": "3301**********1234", "phone": "138****0000",
  "nursing_home_id": 1, "station_id": 3,
  "level_id":2,"level_name":"银卡","level_code":"L2",
  "tags": [{"id":5,"tag_name":"高价值","tag_type":1}],
  "status": 2,                     // 1-未实名 2-已实名 9-禁用
  "created_at": 2025569000
}
```

### 4.3 会员 Excel 导入
- **模板下载** GET `/api/admin/members/import-template`
- **导入** POST `/api/admin/members/import`  (`multipart/form-data` 上传文件)
- 出参 data：`{"success_count":100,"fail_count":3,"fail_list":[{row,reason}]}`

### 4.4 标签字典管理
> 运营端维护“会员经营标签”和“自定义标签”的字典，医护端维护“风险标签”。

| 接口 | 方法 | 权限 `member:tag-manage` |
|------|------|------|
| 标签列表 | GET `/api/admin/tag-dicts` | 按机构/类型过滤 |
| 新增标签 | POST `/api/admin/tag-dicts` | |
| 编辑标签 | PUT `/api/admin/tag-dicts/:id` | |
| 启停/删 | POST/DELETE `/api/admin/tag-dicts/:id/...` | |

**新增标签 body：** `{institution_id, tag_type, tag_name, tag_color, sort_order, status}`

### 4.5 会员等级配置管理（预留）
| 接口 | 方法 | 权限 `member:level-config` |
|------|------|------|
| 等级列表 | GET `/api/admin/member-levels` | |
| 新增/编辑/启用 | POST/PUT/POST `/api/admin/member-levels[...]` | |

**body：** `{level_name, level_code, benefits:[], status}`
> 积分相关字段（`min_points`、`discount_rate`）属**二期（积分/优惠券）**，一期接口不体现。

### 4.6 用户账号管理（users）
| 接口 | 方法 | 权限 `user:view`/`user:manage` |
|------|------|------|
| 用户列表 | GET `/api/admin/users` | 分页，按昵称/手机号/OpenID/状态筛选 |
| 用户详情 | GET `/api/admin/users/:id` | 含该用户绑定的会员列表 |
| 用户启用/禁用 | POST `/api/admin/users/:id/status` | body `{status:1\|2}`（1-正常 2-禁用） |

**用户列表筛选入参：** `nickname`, `phone`, `wx_openid`, `status`

**用户详情出参 data：**
```json
{
  "id": 1, "wx_openid": "oX9f...", "wx_unionid": null,
  "app_openid": "ap_...", "nickname": "张先生", "avatar_url": "https://...",
  "phone": "138****0000", "status": 1,           // 1-正常 2-禁用
  "last_login_at": 2025568200, "login_ip": "127.0.0.1",
  "bind_members": [{
    "relation_id": 1, "member_id": 1,
    "member_name": "张大爷", "member_phone": "138****0000",
    "relation": 1, "relation_name": "子女",
    "is_default": 1                              // 1-默认 0-非默认
  }],
  "created_at": 2025568000
}
```

### 4.7 用户绑定会员管理（user_member_relations / members.user_id）
| 接口 | 方法 | 权限 `user:binding` |
|------|------|------|
| 绑定列表 | GET `/api/admin/users/:id/bindings` | 查询某用户绑定的会员列表 |
| 用户绑定会员 | POST `/api/admin/users/:id/bindings` | body `{member_id, relation, is_default}`，写 user_member_relations |
| 调整关系/设置默认 | PUT `/api/admin/bindings/:relationId` | body `{relation, is_default}` |
| 解绑 | DELETE `/api/admin/users/:id/bindings/:relationId` | 解除绑定关系 |

> 说明：绑定关系写入 `user_member_relations` 表；`relation` 取值 1`子女` / 2`配偶` / 3`兄弟姐妹` / 4`其他`；`is_default` 1-默认 0-非默认（同一用户仅一条为默认）。

---

## 5. 服务与耗材管理

### 5.1 服务项目管理
| 接口 | 方法 | 权限 `service:manage` |
|------|------|------|
| 服务列表 | GET `/api/admin/services` | 分页，按分类/状态/关键字 |
| 服务详情 | GET `/api/admin/services/:id` | |
| 新增服务 | POST `/api/admin/services` | |
| 编辑服务 | PUT `/api/admin/services/:id` | |
| 上架/下架 | POST `/api/admin/services/:id/status` | body `{status:1|9}` |
| 批量上下架 | POST `/api/admin/services/batch-status` | body `{ids:[...], status:1\|9}`，可含 `category` 过滤画像 |
| 删除服务 | DELETE `/api/admin/services/:id` | |

**服务入参/出参 body：**
```json
{
  "name": "上门康复护理", "name_en": null,
  "category": 2,                    // 1基础护理2康复3生活照料4医疗9其他
  "price": 88.00, "unit": "次", "duration": 60,
  "count_list": [1, 10, 20],        // 次数套餐
  "price_list": [88.00, 800.00, 1500.00],
  "description": {},                // JSON 模板
  "service_process": [],            // JSON 服务流程
  "status": 1, "is_consumable_supported": true,  // 是否可选配耗材
  "available_consumables": [{"id":1,"name":"护理耗材包"}]
}
```

### 5.2 耗材包管理
| 接口 | 方法 | 权限 `service:manage` |
|------|------|------|
| 耗材包列表 | GET `/api/admin/consumables` | 分页，按分类/状态/关键字 |
| 耗材详情 | GET `/api/admin/consumables/:id` | |
| 新增耗材包 | POST `/api/admin/consumables` | |
| 编辑耗材包 | PUT `/api/admin/consumables/:id` | |
| 上架/下架 | POST `/api/admin/consumables/:id/status` | |
| 批量上下架 | POST `/api/admin/consumables/batch-status` | body `{ids:[...], status:1\|9}` |
| 服务-耗材关联 | POST `/api/admin/services/:id/consumables` | body `{consumable_ids:[...]}` |

**耗材入参 body：**
```json
{
  "name": "成人护理耗材包", "name_en": null, "code": "HC-001",
  "category": 1, "price": 29.90, "unit": "包",
  "spec": "成人XL 10片/包", "description": {}, "status": 1
}
```

### 5.3 服务-耗材关联配置（service_consumables）
> ✅ v1.8 已补关联表 `service_consumables`。服务与耗材包多对多关联，支持「按服务全局配置」与「按机构个性化覆盖」；下单结算实际选购落在 `service_order_consumables`，本表仅作商品配置承载（下单选配校验与展示）。

| 接口 | 方法 | 权限 `service:manage` | 说明 |
|------|------|------|------|
| 服务可选耗材 | GET `/api/admin/services/:id/consumables` | | 按服务查关联配置，分页 |
| 保存关联配置 | PUT `/api/admin/services/:id/consumables` | body 数组 | 全量替换该服务配置（含全局+机构覆盖） |
| 新增一条关联 | POST `/api/admin/service-consumables` | | |
| 编辑一条关联 | PUT `/api/admin/service-consumables/:id` | | |
| 启停一条关联 | POST `/api/admin/service-consumables/:id/status` | body `{status:1\|9}` | |
| 删除一条关联 | DELETE `/api/admin/service-consumables/:id` | 软删，删除前校验无在途订单引用 | |

**关联配置 body（映射 service_consumables）：**
```json
{
  "service_id": 2,
  "consumable_id": 3,
  "institution_id": null,       // NULL=全局可选；非 NULL=仅该机构可选/机构特定价
  "price_override": 25.00,       // 机构特定价(元)，NULL 沿用 consumables.price
  "max_count": 10,               // 单次下单可选上限(包)
  "required": 0,                 // 0-可选 1-默认必选(随单选但可取消)
  "sort": 1,                     // 排序(升序)
  "status": 1                    // 1-启用 9-禁用
}
```

**编辑服务主表入参（5.1）** 中的可选耗材片段，从「数组名称列表」升级为「关联配置」：
```json
"available_consumables": [
  {"consumable_id": 3, "institution_id": null, "price_override": null,
   "max_count": 10, "required": 0, "sort": 1, "status": 1}
]
```

**下单校验逻辑（口径）：** 下单选配耗材时，须同时满足 `service_consumables` 中：① 该 service_id+consumable_id 有关联；② 生效机构匹配（该机构有覆盖用覆盖，否则用全局 NULL 记录；都没有则不可选）；③ `status=1` 且数量 ≤ `max_count`；④ 若 `required=1` 则随单默认携带但可取消。校验通过后按最终价格（价覆盖优先）落 `service_order_consumables`。

---

### 5.4 机构服务关联配置（institution_services）
> ✅ v1.9 新增关联表 `institution_services`，**支持机构配置上门服务的上下架**：多机构运营时，同一服务在不同机构可有独立的上架状态、机构特定价与排序。`services.status` 为全局上架开关；本表 `status` 为机构维度开关，两者同为「上架」才在对应机构正常售卖；机构未录入该服务则沿用 `services.status`。

| 接口 | 方法 | 权限 `service:manage` | 说明 |
|------|------|------|------|
| 机构服务列表 | GET `/api/admin/institutions/:id/services` | 可按 service_id / status 过滤，分页 | 查某机构开放的上门服务 |
| 关联详情 | GET `/api/admin/institution-services/:id` | | |
| 新增机构服务关联 | POST `/api/admin/institution-services` | body 见下 | 为机构开放某服务 |
| 编辑关联 | PUT `/api/admin/institution-services/:id` | body 见下 | 改机构特定价/排序/上门标记 |
| 机构服务上下架 | POST `/api/admin/institution-services/:id/status` | body `{status:1\|9}` | 机构维度上架/下架 |
| 删除关联 | DELETE `/api/admin/institution-services/:id` | 软删，删除前校验无在途订单引用 | |
| 批量同步 | POST `/api/admin/institutions/:id/services/sync` | body `{service_ids:[...]}` | 一次为机构开通/回收多个服务 |

**关联配置 body（映射 institution_services）：**
```json
{
  "institution_id": 1,
  "service_id": 2,
  "is_home_service": 1,        // 1-上门 2-非上门（默认上门）
  "price_override": 80.00,     // 机构特定价(元)，NULL 沿用 services.price
  "sort": 1,
  "status": 1                  // 机构维度上下架：1-上架 9-下架
}
```

**上线售卖判定（口径）：** 服务在某机构可购买，须满足 `services.status=上架` 且（`institution_services` 无该机构记录 → 沿用全局，或记录 `status=上架`）。机构端列表/下单时应以「全局 × 机构」叠加结果为准。

**上下架联动约束：** 机构服务下架（`status=9`）不影响已生效订单与在途工单继续履约（仅拦截新售卖）；同时可保留 `services.status` 全局开关不受影响。

---

## 6. 订单、支付与退款（财务）管理

### 6.1 服务订单管理
| 接口 | 方法 | 权限 `order:view`/`order:manage` |
|------|------|------|
| 订单列表 | GET `/api/admin/orders` | 分页，按状态/机构/会员/时间段 |
| 订单详情 | GET `/api/admin/orders/:id` | 含订单项、耗材、支付流水、退款单 |
| 新增/编辑（后台代下单） | POST/PUT `/api/admin/orders` | |
| **订单确认** | POST `/api/admin/orders/:id/confirm` | **待确定(2)→生效中(3)**，body `{assigned_staff?}` |
| 订单取消 | POST `/api/admin/orders/:id/cancel` | body `{reason}` |
| 订单退款发起 | POST `/api/admin/orders/:id/refund` | body `{amount,type,reason}` |
| 订单导出 | GET `/api/admin/orders/export` | CSV/Excel |

**订单确认逻辑：** 校验 `order_status=2 待确定`；确认后写 `confirmed_at/confirmed_by`，`order_status=3 生效中`，同步工单进入排单派单。

**订单列表筛选入参：** `order_status`, `institution_id`, `member_id`, `order_no`, `start_time`, `end_time`, `refund_status`

**订单详情出参 data：**
```json
{
  "id": 1, "order_no": "SO20260820001",
  "member_id": 1,"member_name":"张大爷","member_phone":"138****0000",
  "institution_id": 1,
  "service_id":2,"service_name":"中式推拿","service_category":2,
  "consumables": [{"id":3,"name":"护理耗材包","unit_price":29.90,"count":2,"amount":59.80}],
  "total_amount": 800.00, "paid_amount": 800.00, "discount_amount": 0,
  "service_count": 10, "served_count": 3,
  "order_status": 2,                // 对应 共通-API设计 6.1
  "contact_name": "张先生", "contact_phone": "139...",
  "remark": "", "assigned_staff": null, // 意向服务人员ID
  "paid_at": 2025100000, "completed_at": null, "cancelled_at": null, "cancel_reason": null,
  "refund_list": [{"id":1,"refund_no":"RF20260822001","refund_amount":300.00,"refund_status":4}],
  "created_at": 2025080000
}
```

### 6.2 订单退款审核
| 接口 | 方法 | 权限 `order:refund`（财务/运营） |
|------|------|------|
| 退款单列表 | GET `/api/admin/refunds` | 分页，按状态/机构/时间 |
| 退款单详情 | GET `/api/admin/refunds/:id` | 含对应支付流水、订单信息 |
| **退款审批** | POST `/api/admin/refunds/:id/approve` | body `{approve:true\|false, opinion, refund_channel, refund_amount}` |
| 退款详情留痕 | GET `/api/admin/refunds/:id/logs` | 审批历次 |
| 退款导出 | GET `/api/admin/refunds/export` | |

**退款审批 body：**
```json
{
  "approve": true,
  "refund_channel": "wxpay",        // 原路退回渠道，审核通过必填
  "refund_amount": 300.00,          // 实际退款金额，必填
  "opinion": "核对支付流水一致，同意全额退款"
}
```
**出参 data**（审核动作后，前端刷新列表）：`{refund_status: 2|5}` （2-审批通过 → 退款中；5-已拒绝）

**退款审批留痕**：现有 `order_refunds` 表仅含 `approved_by`/`approved_at` 单一审批字段，无法支撑「审批历次留痕」的 GET `/api/admin/refunds/:id/logs` 接口语义。建议新增 `refund_approval_records`（退款审批记录表），字段：
```sql
id BIGINT UNSIGNED 主键
refund_id BIGINT UNSIGNED 关联 order_refunds.id
approver_id BIGINT UNSIGNED 审批人ID
approver_name VARCHAR(50) 审批人姓名(冗余)
approve_result TINYINT 审批结果：2-通过 5-拒绝
approve_type VARCHAR(20) 处理类型：approve(同意)/reject(驳回)
opinion VARCHAR(500) 审批意见
refund_channel VARCHAR(20) 原路退回渠道
refund_amount DECIMAL(10,2) 本次实际退款金额
created_at BIGINT UNSIGNED 记录时间
deleted_at BIGINT UNSIGNED
索引：PRIMARY KEY(id)、KEY idx_refund_id(refund_id)、KEY idx_approver_id(approver_id)
```
> 💡 数据库补充建议：新增 `refund_approval_records`（退款审批记录表）一张表，每次审批动作追加一条留痕记录，`GET /api/admin/refunds/:id/logs` 即查询该表，支持「审批历次留痕」语义。

### 财务-支付渠道配置管理（payment_channels）
| 接口 | 方法 | 权限 `finance:payment-config` |
|------|------|------|
| 渠道配置列表 | GET `/api/admin/payment-channels` | 按渠道类型/状态筛选 |
| 渠道配置详情 | GET `/api/admin/payment-channels/:id` | 含密钥展示规则（脱敏） |
| 新增渠道 | POST `/api/admin/payment-channels` | body 含 `channel_code, channel_type, merchant_id, api_keys, status` |
| 编辑渠道 | PUT `/api/admin/payment-channels/:id` | |
| 启用/禁用渠道 | POST `/api/admin/payment-channels/:id/status` | body `{status:1\|9}`（1-启用 9-禁用） |
| 密钥配置 | PUT `/api/admin/payment-channels/:id/api-keys` | body `{api_keys:{...}}`，加密存储 |

**渠道配置 body（映射 payment_channels）：**
```json
{
  "channel_code": "wechat_pay",    // wechat_pay/alipay（唯一）
  "channel_type": 1,               // 1-微信 2-支付宝 3-银联 9-其他
  "merchant_id": "mch_1000xx",
  "api_keys": {"mch_key": "***", "app_id": "wx..."},  // JSON，加密存储
  "status": 1                      // 1-启用 9-禁用
}
```
> 说明：`api_keys` 存 JSON 且加密，列表中脱敏返回；渠道停用（`status=9`）不影响已产生流水与在途退款。

### 6.3 支付渠道流水（查看）
| 接口 | 方法 | 权限 `finance:channel-log` |
|------|------|------|
| 渠道流水列表 | GET `/api/admin/payment-channel-logs` | 分页，按渠道/状态/时间/匹配状态 |
| 渠道流水详情 | GET `/api/admin/payment-channel-logs/:id` | |

**出参 data：** `{list:[{id, channel_id, channel_code, channel_trade_no, order_type, order_id, amount, transaction_fee, status, matched_at, created_at}], total...}`

### 6.4 对账管理
| 接口 | 方法 | 权限 `finance:reconcile` |
|------|------|------|
| 生成对账单 | POST `/api/admin/reconciliations` | body `{start_date,end_date,reconciliation_type,channel_id}` |
| 对账报表列表 | GET `/api/admin/reconciliations` | 分页，按类型/状态/时间 |
| 对账报表详情 | GET `/api/admin/reconciliations/:id` | 含差异明细 |
| 对账完成/平账 | POST `/api/admin/reconciliations/:id/reconcile` | |
| 差异明细列表 | GET `/api/admin/reconciliations/:id/details` | 按 match_status 过滤 |
| 对账导出 | GET `/api/admin/reconciliations/export` | |
| 支付渠道配置 | GET/POST/PUT `/api/admin/payment-channels...` | 渠道启停 |

**对账详情出参 data：**
```json
{
  "report_no": "RC20260821001", "reconciliation_type": 1,
  "start_date": "2026-08-20", "end_date": "2026-08-20",
  "channel_id":1,"channel_code":"wechat_pay","channel_name":"微信支付",
  "platform_amount": 120000.00, "channel_amount": 119800.00,
  "platform_count": 100, "channel_count": 99,
  "diff_amount": 200.00, "diff_count": 1,
  "status": 3,                    // 1-对账中 2-已平账 3-有差异
  "detail_lines": [{"id":1,"order_type":1,"order_id":1,"channel_trade_no":"wx...","match_status":2,"match_note":"金额不一致"}]
}
```

**差异明细列表出参 data（reconciliation_detail_lines）：**
```json
{"list":[{
  "id": 1, "report_id": 5,
  "order_id": 1, "order_type": 1, "channel_trade_no": "wx...",
  "platform_amount": 88.00, "channel_amount": 86.00,
  "match_status": 2, "match_note": "金额不一致"
}], "total": 1, "page": 1, "page_size": 10}
```
> 说明：差异明细写入 `reconciliation_detail_lines` 表，`match_status` 取值 1-完全匹配 2-金额不一致 3-仅渠道有 4-仅平台有；仅 `status`≠「2-已平账」的对账报表下钻差异明细。

---

## 7. 工单管理

| 接口 | 方法 | 权限 `work-order:view`/`work-order:manage` |
|------|------|------|
| 工单列表 | GET `/api/admin/work-orders` | 分页，按机构/状态/时间/会员 |
| 工单详情 | GET `/api/admin/work-orders/:id` | 含排单、服务留痕、证据、改派记录 |
| 工单排单/派单 | POST `/api/admin/work-orders/:id/dispatch` | body `{staff_id, service_date, planned_start, planned_stop}` |
| 工单改派 | POST `/api/admin/work-orders/:id/reassign` | body `{new_staff_id, reason}`，留痕 |
| 工单取消 | POST `/api/admin/work-orders/:id/cancel` | body `{reason}` |
| 工单批量派单 | POST `/api/admin/work-orders/batch-dispatch` | body `{work_order_ids:[...], staff_id, service_date, planned_start, planned_stop}` |
| 工单批量改派 | POST `/api/admin/work-orders/batch-reassign` | body `{work_order_ids:[...], new_staff_id, reason}`，逐单留痕 |
| 工单导出 | GET `/api/admin/work-orders/export` | |

**工单列表出参 data：**
```json
{"list":[{
  "id":1,"work_order_no":"WO20260822001","order_id":10,
  "member_id": 1,"member_name":"张大爷","member_phone":"138****0000",
  "service_address":"xx小区3-2-101",
  "expected_start_at":2026092000,"expected_stop_at":2026093000,
  "wo_status":1,                     // 1-待排单 2-待接单 3-已接单...7-已取消
  "assignee_id":12,"assignee_name":"李护士","schedule_id":null,
  "expect_staff":101,"expect_staff_name":"张护士长",  // 期望医护（下单时所填，可作派单参考）
  "remark":"",                                       // 工单备注（work_orders.remark）
  "assigned_at":null,"accepted_at":null,"completed_at":null,"cancelled_at":null,
  "created_at":2026050000
}],"total":50,"page":1,"page_size":10}
```

---

## 8. 活动报名与线索管理

### 8.1 活动管理（平台运营统一发布）
| 接口 | 方式 | 权限 `activity:manage` |
|------|------|------|
| 活动列表 | GET `/api/admin/activities` | 分页，按类型/机构/状态/关键字 |
| 活动详情 | GET `/api/admin/activities/:id` | 含指定机构列表、报名情况 |
| 新增活动 | POST `/api/admin/activities` | 含指定参与机构 |
| 编辑活动 | PUT `/api/admin/activities/:id` | |
| 发布/取消 | POST `/api/admin/activities/:id/status` | body `{status:1|2|3|9}` |
| 批量发布/取消 | POST `/api/admin/activities/batch-status` | body `{ids:[...], status:1\|9}` |
| 活动报名列表 | GET `/api/admin/activities/:id/registrations` | 分页，按签到状态 |
| 活动报名导出 | GET `/api/admin/activities/:id/registrations/export` | |
| 指定机构配置 | PUT `/api/admin/activities/:id/institutions` | body `{institution_ids, per-institution config}` |
| 删除活动 | DELETE `/api/admin/activities/:id` | |

**活动入参 body：**
```json
{
  "title": "社区健康教育讲座", "title_en": null, "description": {},
  "cover_image": "https://...", "activity_type": 1,
  "start_time": "2026-09-01 09:00", "end_time": "2026-09-01 11:00",
  "location": "北京市海淀区", "address_detail": "幸福社区服务站",
  "max_participants": 100, "contact_name": "王老师", "contact_phone": "138...",
  "institutions": [{"institution_id":1,"max_participants":50,"start_time":...,"end_time":...}]
}
```
**活动详情出参 data：**
```json
{
  "id": 1, "title": "...", "cover_image": "...", "activity_type": 1,
  "start_time": ..., "end_time": ..., "status": 2,         // 见 4.5 活动状态机
  "institutions": [{"institution_id":1,"max_participants":50,"registered_count":20,"status":1}],
  "registration_summary": {"total": 30, "attended": 20, "cancelled": 0}
}
```

### 8.2 报名记录
| 接口 | 方式 | 权限 |
|------|------|------|
| 报名列表 | GET `/api/admin/activity-registrations` | 分页，按活动/机构/状态/签到 |
| 签到 | POST `/api/admin/activity-registrations/:id/checkin` | 读取签到二维码核销，或运营代签到 |

**报名记录出参：**
```json
{"list":[{
  "id":1,"activity_id":2,"activity_title":"...","institution_id":1,
  "member_id":1,"member_name":"张大爷","member_phone":"138...",
  "participant_count":1,"registration_source":"miniapp",
  "signed_at":2025100000,"status":"1|2|3",      // registered/attended/cancelled
  "referral_mem_id":null,"registered_at":2025000000
}]}
```

### 8.3 线索、咨询、预约
| 接口 | 方法 | 权限 `lead:manage`/`lead:consult` |
|------|------|------|
| 线索列表 | GET `/api/admin/leads` | 分页，按来源/状态/机构/优先级 |
| 线索详情 | GET `/api/admin/leads/:id` | 含跟进记录、转化信息 |
| 新增线索 | POST `/api/admin/leads` | 现场录入 |
| 编辑线索（归属机构） | PUT `/api/admin/leads/:id/assign` | 「自动/手动/转派」处理 |
| 线索跟进记录 | POST `/api/admin/leads/:id/followup` | body `{followup_type, content, operator, result}` |
| 线索转派 | POST `/api/admin/leads/:id/transfer` | body `{new_owner_staff_id, reason}`，留痕 |
| 线索批量转派 | POST `/api/admin/leads/batch-transfer` | body `{lead_ids:[...], new_owner_staff_id, reason}`，逐条写 transfer_records 留痕 |
| 线索转化为会员 | POST `/api/admin/leads/:id/convert` | 将线索转化为会员，登记 `member_id` |
| 线索流失/无效 | POST `/api/admin/leads/:id/lost` | body `{status:6|9, reason}` |
| **线索 Excel 导入** | POST `/api/admin/leads/import` | 模板下载 + 字段映射 + 手机号去重 |
| 咨询列表 | GET `/api/admin/consultations` | 分页，按类型/状态/时间 |
| 预约列表 | GET `/api/admin/appointments` | 分页，按机构/状态/日期 |

**线索列表出参 data：**
```json
{"list":[{
  "id":1,"lead_no":"LD20260822001","institution_id":3,
  "source_type":1,"source_id":1,            // 来源：活动/咨询/预约/转介绍/地推/线上
  "contact_name":"刘女士","contact_phone":"136...",
  "demand_type":2,"demand_detail":"想为母亲安排托护",
  "status":5,  // 线索状态机见 共通API
  "priority":2,
  "owner_staff_id":12,"owner_staff_name":"张顾问",  // 当前负责人（id/name 平铺冗余，便于列表直接展示）
  "assign_at":"2026-08-20 09:14",            // 分配/指定负责人时间（UTC 秒）
  "transfer_records":[],   // 转派留痕(JSON)：{from_staff_id,from_staff_name,to_staff_id,to_staff_name,operator_id,operator_name,reason,time}
  "followups":[{"time":..., "operator":"张顾问","content":"..."}],
  "converted_member_id":1,"converted_at":...,
  "created_by" ...
```

> ✅ v1.8 已补（leads 表 add）：`owner_staff_id BIGINT UNSIGNED` / `owner_staff_name VARCHAR(50)` / `assign_at BIGINT` / `transfer_records JSON`。转派留痕采用 leads 内嵌 JSON（非独立表），避免过度设计；每次转派在 `transfer_records` 追加一条记录。

**线索导入** 出参：`{"success":80,"fail":2,"fail_list":[{"row":3,"reason":"手机号已存在"}]}`

---

## 9. 消息通知管理

### 9.1 站内消息
| 接口 | 方法 | 权限 `system:message` |
|------|------|------|
| 消息列表 | GET `/api/admin/messages` | 分页，接收者/类型/是否已读/时间 |
| 消息详情 | GET `/api/admin/messages/:id` | |
| 发送站内消息 | POST `/api/admin/messages` | 指定/批量/群发 |
| 推送微信 | POST `/api/admin/messages/:id/push` | 微信模板消息 channel 推送 |
| 批量微信推送 | POST `/api/admin/messages/batch-push` | body `{message_ids:[...]} `，逐条推微信渠道并存发送记录 |

### 9.2 消息模板管理
| 接口 | 方法 | 权限 `system:message-template` |
|------|------|------|
| 模板列表 | GET `/api/admin/message-templates` | 分页，按类型/状态 |
| 模板详情 | GET `/api/admin/message-templates/:id` | |
| 新增/编辑模板 | POST/PUT `/api/admin/message-templates` | |
| 启停/删 | POST/DELETE `/api/admin/message-templates/:id/...` | |

### 9.3 短信记录
| 接口 | 方法 | 权限 `system:sms-log` |
|------|------|------|
| 短信发送记录 | GET `/api/admin/sms-logs` | 分页，按手机号/状态/时间 |

### 9.4 系统公告（预留，重大通知 准备用 内容+轮播形式）
| 接口 | 方法 | 权限 `system:announcement` |
|------|------|------|
| 公告列表 | GET `/api/admin/announcements` | 分页，按类型/发布状态 |
| 公告详情 | GET `/api/admin/announcements/:id` | |
| 新增/编辑 | POST/PUT `/api/admin/announcements` | |
| 发布 | POST `/api/admin/announcements/:id/publish` | 置 `publish_status=2` |
| 撤回 | POST `/api/admin/announcements/:id/withdraw` | |
| 删除 | DELETE `/api/admin/announcements/:id` | |

**公告 body：** `{title, content, announcement_type, priority, cover_image, publish_scope, target_ids, expires_at}`（发布时设置 published_at）

---

## 10. 内容管理与轮播（运营配置）

### 10.1 内容管理（图文/视频，cms）
> ✅ v1.8 已补表：`cms_categories` / `cms_content`（含草稿、审核、定时发布、投放端）。字段命名以 v1.8 为准。

| 接口 | 方法 | 权限 `cms:manage` |
|------|------|------|
| 内容列表 | GET `/api/admin/cms/contents` | 分页，按分类/状态/关键字（含草稿） |
| 内容详情 | GET `/api/admin/cms/contents/:id` | |
| 新增内容 | POST `/api/admin/cms/contents` | |
| 编辑内容 | PUT `/api/admin/cms/contents/:id` | |
| 内容审核 | POST `/api/admin/cms/contents/:id/review` | body `{approved:true/false, note}` |
| 批量审核 | POST `/api/admin/cms/contents/batch-review` | body `{ids:[...], approved, note}` |
| 发布/下架 | POST `/api/admin/cms/contents/:id/publish`/`:id/offline` | |
| 批量发布/下架 | POST `/api/admin/cms/contents/batch-status` | body `{ids:[...], action:"publish\|offline"}` |
| 定时上下架 | POST `/api/admin/cms/contents/:id/schedule` | body `{publish_at, offline_at}` |
| 批量删除 | DELETE `/api/admin/cms/contents/batch` | body `{ids:[...]}`，软删 |
| 内容分类管理 | GET/POST/PUT/DELETE `/api/admin/cms/categories` | 分类树 |
| 删除内容 | DELETE `/api/admin/cms/contents/:id` | 软删 |

**内容入参 body（映射 cms_content）：**
```json
{
  "category_id": 1,
  "title": "老年春季健康指南",
  "summary": "换季养生要点",
  "content_type": 1,               // 1-图文 2-视频
  "cover_url": "https://...",      // 封面图
  "video_url": "https://...",      // 当 content_type=2
  "body_md": "## 正文(Markdown)",
  "tags": ["健康","春季"],
  "author_name": "平台编辑",
  "source": "转载-卫健委",
  "is_top": 0,
  "platform": "all",               // all/user-app/staff-app/admin（多端逗号分隔）
  "publish_status": 1,             // 1-草稿 2-已发布 3-已下线
  "publish_at": null               // 计划发布时间 UTC 秒，NULL=立即发布
}
```
> 操作人 `operator_id`/`operator_name` 由服务端从当前管理员会话注入（冗余），前端不传。

### 10.2 轮播/焦点图管理
> ✅ v1.8 已补表 `banners`（支持按投放端/位置/时间段启用）。

| 接口 | 方法 | 权限 `cms:banner-manage` |
|------|------|------|
| 轮播列表 | GET `/api/admin/banners` | 按平台/位置/状态/时间过滤（含分页） |
| 轮播新增 | POST `/api/admin/banners` | |
| 轮播编辑 | PUT `/api/admin/banners/:id` | |
| 启停 | POST `/api/admin/banners/:id/status` | body `{status:1\|9}` |
| 批量启停 | POST `/api/admin/banners/batch-status` | body `{ids:[...], status:1\|9}` |
| 排序 | POST `/api/admin/banners/:id/sort` | body `{sort}` |
| 批量排序 | PUT `/api/admin/banners/sort` | body `{position, platform, ordered_ids:[...]}`，按数组顺序整体重排 |
| 删除 | DELETE `/api/admin/banners/:id` | 软删 |

**轮播 body（映射 banners；出参多返回跳转目标片段）：**
```json
{
  "title": "父亲节养老服务节",
  "image_url": "https://...",
  "platform": 1,              // 投放端：1-用户小程序 2-医护小程序 3-管理后台
  "position": "home_top",     // 投放位置：home_top / activity_ad 等
  "link_type": 3,             // 1-无跳转 2-站内内容 3-活动详情 4-服务详情 5-外链
  "link_value": "88",         // 跳转目标(内容ID/活动ID/路由/URL)，link_type=1 可空
  "sort": 1,                  // 排序(升序)
  "start_at": 1785456000,     // 生效起始 UTC 秒，NULL=立即
  "end_at": 1790870400,       // 生效结束 UTC 秒，NULL=长期
  "status": 1                 // 1-启用 9-停用
}
```

**出参 data（含跳转目标内容片段）：**
```json
{"list":[{
  "id":1,"title":"...","image_url":"...","platform":1,
  "position":"home_top",
  "link_type":3,"link_id":88,"link_title":"社区讲座",
  "start_at":...,"end_at":...,"sort":1,"status":1
}]}
```

**10.3 内容分类管理（cms_categories）**
| 接口 | 方法 | 权限 `cms:manage` | 说明 |
|------|------|------|------|
| 分类树 | GET `/api/admin/cms/categories` | | 两级分类树 |
| 新增分类 | POST `/api/admin/cms/categories` | | |
| 编辑分类 | PUT `/api/admin/cms/categories/:id` | | |
| 启停/删除 | POST/DELETE `/api/admin/cms/categories/:id/...` | 有内容引用不可物理删 |

**分类 body：** `{parent_id, name, code, content_type(0-不限/1-图文/2-视频), sort, status}` (code 唯一)

---

## 11. 数据大屏看板（轻量展示）

| 接口 | 方法 | 权限 `dashboard:view` |
|------|------|------|
| 全局指标总览 | GET `/api/admin/dashboard/overview` | 建档/活动/预约/订单核心指标 |
| 服务趋势 | GET `/api/admin/dashboard/service-trend` | `?start&end&granularity` |
| 服务完成率 | GET `/api/admin/dashboard/service-completion` | 按机构分组 |
| 活动数据 | GET `/api/admin/dashboard/activity` | 活动报名/签到统计 |
| 健康/预警 | GET `/api/admin/dashboard/health` | 评估/预警/方案/效果评估 |

### 11.1 全局指标总览出参 data：
```json
{
  "member_registered": 1520,          // 建档人数
  "member_verified": 1200,            // 已实名
  "activity_registered": 300,         // 活动报名数
  "service_order_count": 860,         // 服务订单数
  "service_appointment_count": 420,   // 服务预约数
  "assessment_count": 800,            // 健康评估次数
  "followup_count": 650,             // 回访次数（含随访）
  "warn_pending": 5, "warn_processing": 3,
  "service_completion_rate": 89.6,    // 服务完成率
  "ai_plan_generated": 12,           // AI 健康方案生成数
  "ai_plan_confirmed": 9,            // AI 方案确认数
  "warn_resolved": 20,               // 预警处置数（闭环）
  "effect_assessment_count": 45       // 效果评估次数
}
```

### 11.2 服务趋势出参（按日趋势）：
```json
{"list":[{"date":"2026-08-20","order_count":12,"work_order_count":8,"service_count":10}],"total":30}
```

### 11.3 健康预警处置出参：
```json
{"list":[{"institution_id":1,"warn_total":40,"warn_resolved":28,"resolve_rate":70.0}],"total":5}
```

---

## 12. 运营配置（全局参数／设置）

| 接口 | 方法 | 权限 `system:config` |
|------|------|------|
| 全局参数列表 | GET `/api/admin/settings` | |
| 更新全局参数 | PUT `/api/admin/settings` | |

**body：** `{"key":"service.radius.default","value":"5","type":"number","description":"默认服务半径(km)"}`

> **随访周期**：不再单独建配置表，随访周期由 `risk_level_dict.followup_cycle_days` 字段按风险等级配置（PRD §3.5.4）——health 模块生成随访计划时按「用户风险等级→对应 followup_cycle_days」计算。

---

## 13. 结论与数据库补充建议

运营后台端已覆盖 **13 大模块、近 140 个接口**（含资质、服务-耗材关联、机构服务配置、内容/轮播，及一致的 `batch-*` 批量操作）。

v1.0 阶段依据数据库 v1.7 标注的数据库缺口，现已全部由 **数据库设计 v1.8** 补齐；v1.2 依据 **数据库设计 v1.9** 新增机构服务关联能力；**v1.3** 补充运营后台批量操作接口（统一 `batch-*` 契约）。本版已逐一对齐并落地为接口契约：

| 原缺口 | 落地 | 本文档接口章节 |
|--------|-----------|----------------|
| `cms_content` / `cms_categories` | ✅ 新增第 9 域运营内容域两表 | §10.1 / §10.3 |
| `banners` | ✅ 新增 `banners`（含 platform/position/时序） | §10.2 |
| `service_consumables` | ✅ 新增关联表（含机构特定价/必选/上限） | §5.3 |
| `institution_services` | ✅ v1.9 新增机构服务关联表（支持机构配置上门服务上下架/特定价/排序） | §5.4 |
| `staff_credentials` | ✅ 资质拆独立表（到期索引/提醒） | §3.3 |
| `institutions.service_radius_km` | ✅ institutions 加字段 | §3.1 |
| 线索转派留痕 | ✅ leads 内嵌 `transfer_records` JSON（不拆表） | §8.3 |
| `risk_followup_config` | ❌ 不建表，改用 `risk_level_dict.followup_cycle_days` | §12 |
| 退款审批留痕 | ⚠️ **本次新增补充建议**：`order_refunds` 仅含单一审批字段，建议新建 `refund_approval_records`（退款审批记录表）支撑「审批历次留痕」 | §6.2 |

> 除 `refund_approval_records`（退款审批留痕表）为本次新增的数据库补充建议外，其余缺口均已闭合，接口契约可直接对齐 v1.10 表结构实现（含机构服务关联 `institution_services`）。

---

### 附：v1.3 批量操作接口汇总

| 模块 | 批量接口 | 方法/路径 | 说明 |
|------|---------|-----------|------|
| 机构 | 批量启用/禁用 | POST `/institutions/batch-status` | §3.1 |
| 会员 | 批量打标签 | POST `/members/batch-tags` | 写 member_tags 关联 |
| 会员 | 批量解除标签 | POST `/members/batch-untag` | |
| 会员 | 批量启用/禁用 | POST `/members/batch-status` | |
| 服务 | 批量上下架 | POST `/services/batch-status` | 可含 category 画像 |
| 耗材 | 批量上下架 | POST `/consumables/batch-status` | |
| 工单 | 批量派单 | POST `/work-orders/batch-dispatch` | 一批待排单统一派给一名医护 |
| 工单 | 批量改派 | POST `/work-orders/batch-reassign` | 逐单留痕 |
| 活动 | 批量发布/取消 | POST `/activities/batch-status` | |
| 线索 | 批量转派 | POST `/leads/batch-transfer` | 逐条写 transfer_records |
| 消息 | 批量微信推送 | POST `/messages/batch-push` | 群发微信模板消息 |
| CMS | 批量审核 | POST `/cms/contents/batch-review` | 复核通过→待发布 |
| CMS | 批量发布/下架 | POST `/cms/contents/batch-status` | |
| CMS | 批量删除 | DELETE `/cms/contents/batch` | 软删 |
| 轮播 | 批量启停 | POST `/banners/batch-status` | |
| 轮播 | 批量排序 | PUT `/banners/sort` | ordered_ids 整体重排 |

> 约定：如上「批量」接口默认 body 形如 `{ids:[...], ...操作字段}`，须在事务内逐条校验（含软删引用校验、状态机校验、权限/机构维度校验），部分写操作逐条留痕；出参建议返回 `{success_count, fail_count, fail_list:[{id,reason}]}` 以便前端提示批量结果。