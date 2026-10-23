from dataclasses import dataclass


@dataclass(frozen=True)
class Email:
    to: tuple
    subject: str
    cc: tuple = ()
    body: str = ""


class EmailBuilder:
    def __init__(self):
        self._to = []
        self._cc = []
        self._subject = ""
        self._body = ""

    def to(self, address):
        self._to.append(address)
        return self

    def cc(self, address):
        self._cc.append(address)
        return self

    def subject(self, text):
        self._subject = text
        return self

    def body(self, text):
        self._body = text
        return self

    # Every rule about a valid combination lives here. The result is frozen, and
    # it holds copies, so changing the builder later cannot change an email already built.
    def build(self):
        if not self._to:
            raise ValueError("an email needs a recipient")
        if self._subject == "":
            raise ValueError("an email needs a subject")
        return Email(to=tuple(self._to), subject=self._subject, cc=tuple(self._cc), body=self._body)
