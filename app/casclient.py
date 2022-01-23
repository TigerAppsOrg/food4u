#!/usr/bin/env python

# -----------------------------------------------------------------------
# casclient.py
# Authors: Alex Halderman, Scott Karlin, Brian Kernighan, Bob Dondero
# -----------------------------------------------------------------------

from urllib.request import urlopen
from urllib.parse import quote
from re import sub
from flask import request, session, redirect, abort

# -----------------------------------------------------------------------

# Return url after stripping out the "ticket" parameter that was
# added by the CAS server.


def strip_ticket(url):
    if url is None:
        return "something is badly wrong"
    url = sub(r'ticket=[^&]*&?', '', url)
    url = sub(r'\?&?$|&$', '', url)
    return url

# -----------------------------------------------------------------------


class CasClient:

    # -------------------------------------------------------------------

    # Initialize a new CASClient object so it uses the given CAS
    # server, or fed.princeton.edu if no server is given.

    def __init__(self, url='https://fed.princeton.edu/cas/'):
        self.cas_url = url

    # -------------------------------------------------------------------

    # Validate a login ticket by contacting the CAS server. If
    # valid, return the user's username; otherwise, return None.

    def validate(self, ticket):
        val_url = (self.cas_url + "validate"
                   + '?service=' + quote(strip_ticket(request.url))
                   + '&ticket=' + quote(ticket))
        lines = []
        with urlopen(val_url) as flo:
            lines = flo.readlines()   # Should return 2 lines.
        if len(lines) != 2:
            return None
        first_line = lines[0].decode('utf-8')
        second_line = lines[1].decode('utf-8')
        if not first_line.startswith('yes'):
            return None
        return second_line

    # -------------------------------------------------------------------

    # Authenticate the remote user, and return the user's username.
    # Do not return unless the user is successfully authenticated.

    def authenticate(self):

        # If the username is in the session, then the user was
        # authenticated previously.  So return the username.
        if 'username' in session:
            return session.get('username')

        # If the request does not contain a login ticket, then redirect
        # the browser to the login page to get one.
        ticket = request.args.get('ticket')
        if ticket is None:
            login_url = (self.cas_url + 'login?service='
                         + quote(request.url))
            abort(redirect(login_url))

        # If the login ticket is invalid, then redirect the browser
        # to the login page to get a new one.
        username = self.validate(ticket)
        if username is None:
            login_url = (self.cas_url + 'login?service='
                         + quote(strip_ticket(request.url)))
            abort(redirect(login_url))

        # The user is authenticated, so store the username in
        # the session.
        session['username'] = username
        return username

    # -------------------------------------------------------------------

    # Logout the user.

    def logout(self, next_url):

        # Delete the user's username from the session.
        session.pop('username')

        # Logout, and redirect the browser to next_url.
        logout_url = (self.cas_url + 'logout?service='
                      + quote(sub('logout', next_url, request.url)))
        abort(redirect(logout_url))

# -----------------------------------------------------------------------


def main():
    print("CasClient does not run standalone")


if __name__ == '__main__':
    main()
