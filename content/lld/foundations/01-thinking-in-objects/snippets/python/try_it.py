from library_after import Library, Member  # @hide
# Change a limit, a loan period or a day, then press Run.
lib = Library()
lib.add_book("b1", "Dune", 1)
lib.add_book("b2", "Emma", 2)
lib.join(Member("ana", "Ana", 1))        # limit 1; try 2
lib.join(Member("sam", "Sam", 3, 7))     # a student: 7 days

print(lib.borrow("ana", "b1", 0) is not None)  # True
print(lib.borrow("ana", "b2", 0) is not None)  # False: Ana is at her limit
print(lib.borrow("sam", "b2", 0).due_day)      # 7
print(lib.give_back("ana", "b1", 20))          # 3.0: six days late at 0.5
print(lib.give_back("sam", "b2", 10))          # 1.5: three days late
