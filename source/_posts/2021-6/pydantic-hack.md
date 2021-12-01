---
title: 怎样让 Pydantic 自动实例出子类
date: 2021-06-24 11:41:37
categories: Python
tags:
    - Python
excerpt: 如何使 Pydantic 能够自动依据 type 键的值自动创建子类实例
---

# 问题描述

## 简述
现有以下类型。我们想要创建在 base 的时候，能够依据 type 键的值自动创建子类实例

```python
from typing import Literal
from pydantic import BaseModel  # pylint: disable=no-name-in-module

class base(BaseModel):
    type: str


class sup1(base):
    type: Literal['sup1']
    sup1: str


class sup2(base):
    type: Literal['sup2']
    sup2: str
```

## 问题来源
[`mirai-api-http`](https://github.com/project-mirai/mirai-api-http) 是 QQbot [`mirai`](https://github.com/mamoe/mirai) 的 api 插件， 它是使用这种 json 表示消息信息：

```json
{
    "type": "FriendMessage",
    "sender": { "id": 123, "nickname": "", "remark": "" },
    "messageChain": [
        { "type": "Source", "id": 123456, "time": 123456 },
        { "type": "AtAll" },
        { "type": "Plain", "text": "hello world" }
    ]
}
```
其中 messageChain 中的 Text 有许多类型，sender 也有许多类型

在往本人的框架 [`madoka`](https://github.com/Simon-Chenzw/madoka) 中加入 pydantic 时，就产生了这种需求
譬如上述 json 实例出来的应该是：
```yaml
context: # class: FriendContext
    type: FriendMessage
    sender: # class: FriendSender
    messageChain:
        - SourceText
        - AtText
        - PlainText
```



# 实现方法

## 太长不看版
+ `__init_subclass__` 记录所有子类及其 type 键值
+ 创造 type 键值与 cls 的字典
+ 通过 `__new__` hack 实例创建的过程，使其返回子类

## 软件版本
+ python: 3.9.5
+ pydantic: 1.8.2

## 1. 使用 Union
依据 Pydantic 的 [文档](https://pydantic-docs.helpmanual.io/usage/types/#unions)
Pydantic 会依次尝试 Union 中的类，并使用第一个匹配的

实现代码：
```python
from typing import Literal, Union
from pydantic import BaseModel  # pylint: disable=no-name-in-module


class base(BaseModel):
    type: str


class sup1(base):
    type: Literal['sup1']
    sup1: str


class sup2(base):
    type: Literal['sup2']
    sup2: str


class foo(BaseModel):
    __root__: list[Union[sup1, sup2, base]]


obj = foo.parse_obj([
    {'type': 'sup1', 'sup1': 'this is sup1'},
    {'type': 'sup2', 'sup2': 'this is sup2'},
    {'type': 'sup3', 'sup3': 'this is sup3'},
])
print(obj)

# [
#     sup1(type='sup1', sup1='this is sup1'),
#     sup2(type='sup2', sup2='this is sup2'),
#     base(type='sup3')
# ]
```

### 优劣
+ 优点：
  + 简单易写
+ 缺点
  + 需要遍历匹配，可能有效率问题
  + 添加新类时，需要手动维护 Union
    + 或者通过 `__init_subclass__` 动态修改 annotations （此处不展开）


## 2. 使用 `__new__` hack 初始化过程

### 分析 parse_obj 的初始化过程
1. `cls.parse_obj(obj)`
2. 调用 `cls(**obj)`
3. python 创建 cls 的实例
4. 调用实例的 `__init__`
5. 递归处理 实例的键值

### 解决方法
pydantic 的每一层实例化都逃不开 `cls(**obj)` ，从 python 官方文档可以找到这样一个函数 [`__new__`](https://docs.python.org/zh-cn/3/reference/datamodel.html#object.__new__)。
它允许我们返回一个其他实例，并调用那个实例的 `__init__` 。所以我们可以使用这个函数，动态返回子类

实现代码：
```python
from __future__ import annotations
from typing import Literal, Type, get_args, get_origin
from pydantic import BaseModel  # pylint: disable=no-name-in-module


class base(BaseModel, extra='forbid'):
    type: str

    class TypeMap:
        type_key: str = 'type'
        types: dict[str, Type[base]] = {}
        extra_name: str = 'Extra'
        extra: Type[base]

        @classmethod
        def add(cls, ins_cls: Type[base]) -> None:
            if ins_cls.__name__ == cls.extra_name:
                cls.extra = ins_cls
                return

            field = ins_cls.__fields__.get(cls.type_key)
            if field is None:
                return

            if get_origin(field.type_) is Literal:
                for name in get_args(field.type_):
                    assert name not in cls.types, "can't have same key value"
                    cls.types[name] = ins_cls

    def __init_subclass__(cls, **kwargs) -> None:
        cls.TypeMap.add(cls)
        return super().__init_subclass__()

    def __new__(cls, *args, **kwargs) -> Type[base]:
        key = cls.TypeMap.type_key
        if cls is base:
            if key in kwargs:
                new_cls = cls.TypeMap.types.get(kwargs[key], cls.TypeMap.extra)
                return super().__new__(new_cls)
            else:
                return super().__new__(cls.TypeMap.extra)
        else:
            return super().__new__(cls)


class sup1(base):
    type: Literal['sup1']
    sup1: str


class sup2(base):
    type: Literal['sup2']
    sup2: str


class sup3(sup2):
    type: Literal['sup3']
    sup3: str


class Extra(base, extra='allow'):
    pass


class foo(BaseModel):
    __root__: list[base]


obj = foo.parse_obj([
    {
        'type': 'sup1',
        'sup1': 'this is sup1'
    },
    {
        'type': 'sup2',
        'sup2': 'this is sup2'
    },
    {
        'type': 'sup3',
        'sup2': 'this is sup2',
        'sup3': 'this is sup3'
    },
    {
        'type': 'unknown',
        'extra': 'this is extra'
    },
])

print(obj)

# [
#     sup1(type='sup1', sup1='this is sup1'),
#     sup2(type='sup2', sup2='this is sup2'),
#     sup3(type='sup3', sup2='this is sup2', sup3='this is sup3'),
#     Extra(type='unknown', extra='this is extra'),
# ]
```

### extra 策略
这份代码的 pydantic extra 策略是：除了 Extra 外的子类均为 forbid，同时 base 不会有实例的可能。
如果你的 extra 策略和我不同，譬如全局 allow 或 forbid。可以将 Extra 的部分代码删掉，并将 TypeMap.extra 改为 base

### 其他
在实现这份代码时，我考虑过不同的实现方式。比如使用 metaclass ，但是会与 pydantic 的 meta 冲突。再比如把这份代码抽出成单独的类，从而达到复用，但是容易在类嵌类中冲突，并且代码会过于“动态”，并且考虑到本人框架中使用到这种技术的只有寥寥几个，所以放弃了这种实现方式。
